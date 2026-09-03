/**
 * File: src/pages/performance/ReviewCycles.tsx
 * Complete Review Cycles Management page with list view, create/edit modal, and details modal
 * Based on provided screenshots design
 */

import React, { useState, useMemo } from "react";
import { refLabel } from "@/services/_http";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { useResourceData } from "@/hooks/useResourceData";
import {
  reviewCycleHooks,
  type ReviewCycle as ApiReviewCycle,
} from "@/services/performance";
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
  Calendar,
  CheckCircle,
  Clock,
  Repeat,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewCycle {
  id: string;
  name: string;
  frequency: "Annual" | "Semi-Annual" | "Quarterly" | "Monthly";
  description: string;
  status: "Active" | "Inactive";
  createdBy: string;
  createdAt: string;
}

// ─── Sample Data (offline fallback seed, API shape) ────────────────────────────

const sampleReviewCycles: ApiReviewCycle[] = [
  { id: "1", name: "Q4 2024 Quarterly Business Review", frequency: "quarterly", description: "Fourth quarter assessment focusing on KPI achievement and deliverables", status: "inactive" },
  { id: "2", name: "March 2025 Quarterly Prep Review", frequency: "monthly", description: "Monthly check for quarterly goal preparation and optimization", status: "active" },
  { id: "3", name: "Sales Team Performance Review", frequency: "quarterly", description: "Sales performance evaluation focusing on revenue targets and client relations", status: "active" },
  { id: "4", name: "Cross-Functional Project Performance Review", frequency: "quarterly", description: "Project-based evaluation assessing collaboration and deliverable quality", status: "active" },
  { id: "5", name: "Q1 2025 Performance Check-In", frequency: "quarterly", description: "First quarter review for goal setting and milestone tracking", status: "active" },
  { id: "6", name: "Remote Work Performance Evaluation", frequency: "semi-annual", description: "Remote employee assessment focusing on productivity and communication", status: "active" },
  { id: "7", name: "Technical Skills Assessment Cycle", frequency: "semi-annual", description: "Technical competency evaluation covering skill proficiency and innovation", status: "active" },
];

// ─── API ↔ display mapping ─────────────────────────────────────────────────────

function mapFrequency(raw: string): ReviewCycle["frequency"] {
  const f = (raw ?? "quarterly").toLowerCase();
  if (f === "annual") return "Annual";
  if (f === "semi-annual" || f === "semi_annual") return "Semi-Annual";
  if (f === "monthly") return "Monthly";
  return "Quarterly";
}

function mapFromApi(p: any): ReviewCycle {
  const rawStatus = (p.status ?? "active") as string;
  const status: "Active" | "Inactive" = rawStatus.toLowerCase() === "inactive" ? "Inactive" : "Active";
  return {
    id: String(p.id ?? p._id ?? ""),
    name: p.name ?? "",
    frequency: mapFrequency(p.frequency ?? "quarterly"),
    description: p.description ?? "",
    status,
    createdBy: refLabel(p.created_by ?? p.createdBy) || "Company",
    createdAt: (p.createdAt ?? p.created_at ?? "").slice(0, 10),
  };
}

const frequencies = ["Annual", "Semi-Annual", "Quarterly", "Monthly"];
const statuses = ["Active", "Inactive"];

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

type SortField = "name" | "frequency" | "description" | "status" | "createdAt";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const ReviewCycles: React.FC = () => {
  const navigate = useNavigate();
  const {
    items: rawCycles,
    create,
    update,
    remove,
  } = useResourceData(reviewCycleHooks, { seed: sampleReviewCycles, params: { page: 1, limit: 100 } });
  const reviewCycles = useMemo(() => rawCycles.map(mapFromApi), [rawCycles]);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<ReviewCycle | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [cycleFormData, setCycleFormData] = useState({
    name: "",
    frequency: "Quarterly" as
      | "Annual"
      | "Semi-Annual"
      | "Quarterly"
      | "Monthly",
    description: "",
    status: "Active" as "Active" | "Inactive",
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

  const filteredCycles = useMemo(() => {
    let result = [...reviewCycles];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((c) => c.status === statusFilter);
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "createdAt") {
        aVal = a.createdAt;
        bVal = b.createdAt;
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [reviewCycles, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredCycles.length / perPage);
  const paginatedCycles = filteredCycles.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetCycleForm = () => {
    setCycleFormData({
      name: "",
      frequency: "Quarterly",
      description: "",
      status: "Active",
    });
  };

  const openCreateModal = () => {
    resetCycleForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (cycle: ReviewCycle) => {
    setSelectedCycle(cycle);
    setCycleFormData({
      name: cycle.name,
      frequency: cycle.frequency,
      description: cycle.description,
      status: cycle.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (cycle: ReviewCycle) => {
    setSelectedCycle(cycle);
    setShowViewModal(true);
  };

  const openDeleteModal = (cycle: ReviewCycle) => {
    setSelectedCycle(cycle);
    setShowDeleteModal(true);
  };

  const freqToApi = (f: string): ApiReviewCycle["frequency"] => {
    if (f === "Annual") return "annual";
    if (f === "Semi-Annual") return "semi-annual";
    if (f === "Monthly") return "monthly";
    return "quarterly";
  };

  const handleSaveCycle = async () => {
    if (!cycleFormData.name) {
      showToast("Please enter review cycle name", "info");
      return;
    }
    if (!cycleFormData.frequency) {
      showToast("Please select frequency", "info");
      return;
    }

    const payload: Partial<ApiReviewCycle> = {
      name: cycleFormData.name,
      frequency: freqToApi(cycleFormData.frequency),
      description: cycleFormData.description,
      status: cycleFormData.status.toLowerCase() as "active" | "inactive",
    };

    try {
      if (isEditing && selectedCycle) {
        await update(selectedCycle.id, payload);
        showToast("Review cycle updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(payload);
        showToast("Review cycle created successfully!", "success");
        setShowCreateModal(false);
      }
      resetCycleForm();
    } catch {
      showToast("Could not save review cycle. Please try again.", "error");
    }
  };

  const handleDeleteCycle = async () => {
    if (!selectedCycle) return;
    try {
      await remove(selectedCycle.id);
      showToast("Review cycle deleted successfully!", "success");
    } catch {
      showToast("Could not delete review cycle.", "error");
    }
    setShowDeleteModal(false);
    setSelectedCycle(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700";
      case "Inactive":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="w-3 h-3" />;
      case "Inactive":
        return <X className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case "Annual":
        return <Calendar className="w-3 h-3" />;
      case "Semi-Annual":
        return <Repeat className="w-3 h-3" />;
      case "Quarterly":
        return <Repeat className="w-3 h-3" />;
      case "Monthly":
        return <Calendar className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
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
              {isEditing ? "Edit Review Cycle" : "Create Review Cycle"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update review cycle information"
                : "Add a new review cycle"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetCycleForm();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={cycleFormData.name}
              onChange={(e) =>
                setCycleFormData({ ...cycleFormData, name: e.target.value })
              }
              placeholder="Enter review cycle name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency *
            </label>
            <select
              value={cycleFormData.frequency}
              onChange={(e) =>
                setCycleFormData({
                  ...cycleFormData,
                  frequency: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              {frequencies.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={cycleFormData.description}
              onChange={(e) =>
                setCycleFormData({
                  ...cycleFormData,
                  description: e.target.value,
                })
              }
              rows={3}
              placeholder="Enter review cycle description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={cycleFormData.status}
              onChange={(e) =>
                setCycleFormData({
                  ...cycleFormData,
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
              resetCycleForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCycle}
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
              Review Cycle Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedCycle?.name}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedCycle && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedCycle.name}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedCycle.status)}`}
              >
                {getStatusIcon(selectedCycle.status)}
                {selectedCycle.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Frequency</p>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  {getFrequencyIcon(selectedCycle.frequency)}
                  {selectedCycle.frequency}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created By</p>
                <p className="text-sm text-gray-600">
                  {selectedCycle.createdBy}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created At</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedCycle.createdAt)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">
                  {selectedCycle.description || "-"}
                </p>
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
              if (selectedCycle) openEditModal(selectedCycle);
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
            Delete Review Cycle
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedCycle?.name}</span>? This
            action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteCycle}
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
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col">
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
          <span className="text-gray-900 font-medium">Review Cycles</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Review Cycles
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
                placeholder="Search review cycles..."
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
                      setStatusFilter("Active");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Active
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Inactive");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Inactive
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
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="name" label="Name" />
                <SortHeader field="frequency" label="Frequency" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Description
                </th>
                <SortHeader field="status" label="Status" />
                <SortHeader field="createdAt" label="Created" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedCycles.map((cycle) => (
                <tr
                  key={cycle.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(cycle)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {cycle.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      {getFrequencyIcon(cycle.frequency)}
                      {cycle.frequency}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-md truncate">
                    {cycle.description}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cycle.status)}`}
                    >
                      {getStatusIcon(cycle.status)}
                      {cycle.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(cycle.createdAt)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(cycle)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(cycle)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(cycle)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedCycles.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No review cycles found.
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
            {filteredCycles.length === 0 ? 0 : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredCycles.length)} of{" "}
            {filteredCycles.length} results
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
