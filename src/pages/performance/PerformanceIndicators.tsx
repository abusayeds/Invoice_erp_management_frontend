/**
 * File: src/pages/performance/PerformanceIndicators.tsx
 * Complete Performance Indicators Management page with list view, create/edit modal, and details modal
 * Based on provided screenshots design
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { useResourceData } from "@/hooks/useResourceData";
import {
  indicatorHooks,
  indicatorCategoryHooks,
  type PerformanceIndicator as ApiPerformanceIndicator,
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
  CheckCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PerformanceIndicator {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  description: string;
  measurementUnit: string;
  targetValue: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

// ─── Sample Data (offline fallback seed, API shape) ────────────────────────────

const sampleIndicators: ApiPerformanceIndicator[] = [
  { id: "1", category_id: "cat1", name: "Mentorship Hours", description: "Hours dedicated to mentoring junior employees", measurement_unit: "Hours", target_value: "10", status: "inactive" },
  { id: "2", category_id: "cat2", name: "Response Rate", description: "Percentage of customer inquiries responded to", measurement_unit: "Percentage", target_value: "100%", status: "active" },
  { id: "3", category_id: "cat2", name: "Customer Satisfaction", description: "Average customer satisfaction rating", measurement_unit: "Rating (1-5)", target_value: "4.5", status: "active" },
  { id: "4", category_id: "cat3", name: "Resolution Time", description: "Average time to resolve customer issues", measurement_unit: "Days", target_value: "<3", status: "active" },
  { id: "5", category_id: "cat4", name: "Output Volume", description: "Number of units produced per day", measurement_unit: "Units", target_value: "500", status: "active" },
];

// ─── API ↔ display mapping ─────────────────────────────────────────────────────

function mapFromApi(p: any): PerformanceIndicator {
  const catRaw = p.category_id ?? p.categoryId;
  const catId = catRaw && typeof catRaw === "object" ? String(catRaw._id ?? catRaw.id ?? "") : String(catRaw ?? "");
  const catName = catRaw && typeof catRaw === "object" ? (catRaw.name ?? "") : "";
  const rawStatus = (p.status ?? "active") as string;
  const status: "Active" | "Inactive" = rawStatus.toLowerCase() === "inactive" ? "Inactive" : "Active";
  return {
    id: String(p.id ?? p._id ?? ""),
    categoryId: catId,
    category: catName,
    name: p.name ?? "",
    description: p.description ?? "",
    measurementUnit: p.measurement_unit ?? p.measurementUnit ?? "",
    targetValue: p.target_value ?? p.targetValue ?? "",
    status,
    createdAt: (p.createdAt ?? p.created_at ?? "").slice(0, 10),
  };
}

const categories = [
  "Leadership & Mentoring",
  "Customer Focus & Service",
  "Problem Solving & Critical Thinking",
  "Productivity & Efficiency",
  "Professional Growth & Development",
  "Team Collaboration",
  "Time Management & Organization",
  "Work Quality & Accuracy",
];

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

type SortField =
  | "name"
  | "category"
  | "measurementUnit"
  | "targetValue"
  | "status";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const PerformanceIndicators: React.FC = () => {
  const navigate = useNavigate();
  const {
    items: rawIndicators,
    create,
    update,
    remove,
  } = useResourceData(indicatorHooks, { seed: sampleIndicators, params: { page: 1, limit: 100 } });
  const indicators = useMemo(() => rawIndicators.map(mapFromApi), [rawIndicators]);

  // Category options from API
  const catQuery = indicatorCategoryHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const categoryOptions = useMemo(
    () =>
      (catQuery.data ?? []).map((c: any) => ({
        id: String(c.id ?? c._id ?? ""),
        name: c.name ?? "",
      })),
    [catQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIndicator, setSelectedIndicator] =
    useState<PerformanceIndicator | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [indicatorFormData, setIndicatorFormData] = useState({
    name: "",
    categoryId: "",
    category: "",
    description: "",
    measurementUnit: "",
    targetValue: "",
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

  const filteredIndicators = useMemo(() => {
    let result = [...indicators];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.measurementUnit.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((i) => i.status === statusFilter);
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
  }, [indicators, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredIndicators.length / perPage);
  const paginatedIndicators = filteredIndicators.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetIndicatorForm = () => {
    setIndicatorFormData({
      name: "",
      categoryId: "",
      category: "",
      description: "",
      measurementUnit: "",
      targetValue: "",
      status: "Active",
    });
  };

  const openCreateModal = () => {
    resetIndicatorForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (indicator: PerformanceIndicator) => {
    setSelectedIndicator(indicator);
    setIndicatorFormData({
      name: indicator.name,
      categoryId: indicator.categoryId,
      category: indicator.category,
      description: indicator.description,
      measurementUnit: indicator.measurementUnit,
      targetValue: indicator.targetValue,
      status: indicator.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (indicator: PerformanceIndicator) => {
    setSelectedIndicator(indicator);
    setShowViewModal(true);
  };

  const openDeleteModal = (indicator: PerformanceIndicator) => {
    setSelectedIndicator(indicator);
    setShowDeleteModal(true);
  };

  const handleSaveIndicator = async () => {
    if (!indicatorFormData.name) {
      showToast("Please enter indicator name", "info");
      return;
    }
    if (!indicatorFormData.categoryId && !indicatorFormData.category) {
      showToast("Please select category", "info");
      return;
    }
    if (!indicatorFormData.measurementUnit) {
      showToast("Please enter measurement unit", "info");
      return;
    }
    if (!indicatorFormData.targetValue) {
      showToast("Please enter target value", "info");
      return;
    }

    const payload: Partial<ApiPerformanceIndicator> = {
      category_id: indicatorFormData.categoryId || indicatorFormData.category,
      name: indicatorFormData.name,
      description: indicatorFormData.description,
      measurement_unit: indicatorFormData.measurementUnit,
      target_value: indicatorFormData.targetValue,
      status: indicatorFormData.status.toLowerCase() as "active" | "inactive",
    };

    try {
      if (isEditing && selectedIndicator) {
        await update(selectedIndicator.id, payload);
        showToast("Performance indicator updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(payload);
        showToast("Performance indicator created successfully!", "success");
        setShowCreateModal(false);
      }
      resetIndicatorForm();
    } catch {
      showToast("Could not save performance indicator. Please try again.", "error");
    }
  };

  const handleDeleteIndicator = async () => {
    if (!selectedIndicator) return;
    try {
      await remove(selectedIndicator.id);
      showToast("Performance indicator deleted successfully!", "success");
    } catch {
      showToast("Could not delete performance indicator.", "error");
    }
    setShowDeleteModal(false);
    setSelectedIndicator(null);
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
              {isEditing
                ? "Edit Performance Indicator"
                : "Create Performance Indicator"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update indicator information"
                : "Add a new performance indicator"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetIndicatorForm();
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
              value={indicatorFormData.name}
              onChange={(e) =>
                setIndicatorFormData({
                  ...indicatorFormData,
                  name: e.target.value,
                })
              }
              placeholder="Enter indicator name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={indicatorFormData.categoryId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const opt = categoryOptions.find((c) => c.id === selectedId);
                setIndicatorFormData({
                  ...indicatorFormData,
                  categoryId: selectedId,
                  category: opt?.name ?? selectedId,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select category</option>
              {categoryOptions.length > 0
                ? categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                : categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={indicatorFormData.description}
              onChange={(e) =>
                setIndicatorFormData({
                  ...indicatorFormData,
                  description: e.target.value,
                })
              }
              rows={3}
              placeholder="Enter indicator description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Measurement Unit *
            </label>
            <input
              type="text"
              value={indicatorFormData.measurementUnit}
              onChange={(e) =>
                setIndicatorFormData({
                  ...indicatorFormData,
                  measurementUnit: e.target.value,
                })
              }
              placeholder="e.g., %, hours, count"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Value *
            </label>
            <input
              type="text"
              value={indicatorFormData.targetValue}
              onChange={(e) =>
                setIndicatorFormData({
                  ...indicatorFormData,
                  targetValue: e.target.value,
                })
              }
              placeholder="e.g., 4.5, <24, 90%"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={indicatorFormData.status}
              onChange={(e) =>
                setIndicatorFormData({
                  ...indicatorFormData,
                  status: e.target.value as "Active" | "Inactive",
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetIndicatorForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveIndicator}
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
              Performance Indicator Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedIndicator?.name}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedIndicator && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedIndicator.name}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedIndicator.status)}`}
              >
                {getStatusIcon(selectedIndicator.status)}
                {selectedIndicator.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm text-gray-600">
                  {selectedIndicator.category}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Measurement Unit</p>
                <p className="text-sm text-gray-600">
                  {selectedIndicator.measurementUnit}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Target Value</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedIndicator.targetValue}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created At</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedIndicator.createdAt)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">
                  {selectedIndicator.description || "-"}
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
              if (selectedIndicator) openEditModal(selectedIndicator);
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
            Delete Indicator
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedIndicator?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteIndicator}
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
          <span className="text-gray-900 font-medium">
            Performance Indicators
          </span>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Performance Indicators
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
                placeholder="Search indicators..."
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
                <SortHeader field="category" label="Category" />
                <SortHeader field="measurementUnit" label="Unit" />
                <SortHeader field="targetValue" label="Target Value" />
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedIndicators.map((indicator) => (
                <tr
                  key={indicator.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(indicator)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {indicator.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {indicator.category}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {indicator.measurementUnit}
                  </td>
                  <td className="px-4 py-3 font-medium text-blue-600">
                    {indicator.targetValue}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(indicator.status)}`}
                    >
                      {getStatusIcon(indicator.status)}
                      {indicator.status}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(indicator)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(indicator)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(indicator)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedIndicators.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No performance indicators found.
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
            {filteredIndicators.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredIndicators.length)} of{" "}
            {filteredIndicators.length} results
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
                  className={`w-8 h-8 text-sm rounded-md flex items-center justify-center ${
                    currentPage === pageNumber
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
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
