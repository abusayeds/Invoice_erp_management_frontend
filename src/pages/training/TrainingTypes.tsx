/**
 * File: src/pages/training/TrainingTypesSetup.tsx
 * Manage Training Types – complete CRUD with list view, modals, and branch/department dependency
 * Design matches EmployeeGoals component exactly
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { useResourceData } from "@/hooks/useResourceData";
import {
  trainingTypeHooks,
  type TrainingType as ApiTrainingType,
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
  Eye,
  Building2,
  Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrainingType {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  departmentId: string;
  departmentName: string;
  description: string;
  createdAt: string;
}

// ─── Sample Data (API snake_case seed) ────────────────────────────────────────

const sampleTrainingTypes: ApiTrainingType[] = [
  { id: "1", name: "Artificial Intelligence & Machine Learning", description: "AI fundamentals, machine learning algorithms, and practical implementation strategies.", branch_id: "5", department_id: "1" },
  { id: "2", name: "Risk Management & Assessment", description: "Risk identification, assessment methodologies, and mitigation strategies.", branch_id: "4", department_id: "2" },
  { id: "3", name: "International Business & Trade", description: "Global business operations, international trade regulations.", branch_id: "3", department_id: "3" },
  { id: "4", name: "Environmental Sustainability", description: "Sustainable business practices, environmental compliance.", branch_id: "2", department_id: "4" },
  { id: "5", name: "Negotiation & Conflict Resolution", description: "Professional negotiation techniques, conflict resolution frameworks.", branch_id: "1", department_id: "5" },
];

// ─── API ↔ display mapping ─────────────────────────────────────────────────────

function mapFromApi(p: any): TrainingType {
  const branch = p.branch_id ?? p.branchId;
  const dept = p.department_id ?? p.departmentId;
  return {
    id: String(p.id ?? p._id ?? ""),
    name: p.name ?? "",
    description: p.description ?? "",
    branchId: typeof branch === "object" ? String(branch?._id ?? branch?.id ?? "") : String(branch ?? ""),
    branchName: typeof branch === "object" ? (branch?.branch_name ?? branch?.name ?? "") : "",
    departmentId: typeof dept === "object" ? String(dept?._id ?? dept?.id ?? "") : String(dept ?? ""),
    departmentName: typeof dept === "object" ? (dept?.department_name ?? dept?.name ?? "") : "",
    createdAt: (p.createdAt ?? p.created_at ?? "").slice(0, 10),
  };
}

type SortField = "name" | "branchName" | "departmentName" | "description";
type SortDir = "asc" | "desc";

// ─── Helper ───────────────────────────────────────────────────────────────────

const truncate = (str: string, length = 60) => {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const TrainingTypesSetup: React.FC = () => {
  const navigate = useNavigate();

  const {
    items: raw,
    create,
    update,
    remove,
  } = useResourceData(trainingTypeHooks, {
    seed: sampleTrainingTypes,
    params: { page: 1, limit: 100 },
  });
  const trainingTypes = useMemo(() => raw.map(mapFromApi), [raw]);

  // Load branch + department options
  const branchQuery = branchHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const branchOptions = useMemo(
    () =>
      (branchQuery.data ?? []).map((b: any) => ({
        id: String(b.id ?? b._id ?? ""),
        name: b.branch_name ?? b.name ?? "",
      })),
    [branchQuery.data],
  );
  const departmentQuery = departmentHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const departmentOptions = useMemo(
    () =>
      (departmentQuery.data ?? []).map((d: any) => ({
        id: String(d.id ?? d._id ?? ""),
        name: d.department_name ?? d.name ?? "",
        branchId: String(
          typeof d.branch_id === "object"
            ? (d.branch_id?._id ?? d.branch_id?.id ?? "")
            : (d.branch_id ?? ""),
        ),
      })),
    [departmentQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTrainingType, setSelectedTrainingType] =
    useState<TrainingType | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    branchId: "",
    departmentId: "",
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

  // ─── Filtered & Sorted Data ─────────────────────────────────────────────────

  const filteredTypes = useMemo(() => {
    let result = [...trainingTypes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tt) =>
          tt.name.toLowerCase().includes(q) ||
          tt.branchName.toLowerCase().includes(q) ||
          tt.departmentName.toLowerCase().includes(q) ||
          tt.description.toLowerCase().includes(q),
      );
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
  }, [trainingTypes, searchQuery, sortField, sortDir]);

  const totalPages = Math.ceil(filteredTypes.length / perPage);
  const paginatedTypes = filteredTypes.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      branchId: "",
      departmentId: "",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (item: TrainingType) => {
    setSelectedTrainingType(item);
    setFormData({
      name: item.name,
      description: item.description,
      branchId: item.branchId,
      departmentId: item.departmentId,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (item: TrainingType) => {
    setSelectedTrainingType(item);
    setShowViewModal(true);
  };

  const openDeleteModal = (item: TrainingType) => {
    setSelectedTrainingType(item);
    setShowDeleteModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast("Please enter training type name", "info");
      return;
    }
    if (!formData.branchId) {
      showToast("Please select a branch", "info");
      return;
    }
    if (!formData.departmentId) {
      showToast("Please select a department", "info");
      return;
    }

    const payload: Partial<ApiTrainingType> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      branch_id: formData.branchId,
      department_id: formData.departmentId,
    };

    try {
      if (isEditing && selectedTrainingType) {
        await update(selectedTrainingType.id, payload);
        showToast("Training type updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(payload);
        showToast("Training type created successfully!", "success");
        setShowCreateModal(false);
      }
      resetForm();
    } catch {
      showToast("Could not save training type. Please try again.", "error");
    }
  };

  const handleDelete = async () => {
    if (!selectedTrainingType) return;
    try {
      await remove(selectedTrainingType.id);
      showToast("Training type deleted successfully!", "success");
    } catch {
      showToast("Could not delete training type.", "error");
    }
    setShowDeleteModal(false);
    setSelectedTrainingType(null);
  };

  // Get available departments based on selected branch
  const availableDepartments =
    departmentOptions.length > 0
      ? departmentOptions.filter((d) => d.branchId === formData.branchId)
      : [];

  // ─── Sort Header Component ──────────────────────────────────────────────────

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
              {isEditing ? "Edit Training Type" : "Create Training Type"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update training type information"
                : "Add a new training type"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter training type name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              placeholder="Enter training type description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.branchId}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  branchId: e.target.value,
                  departmentId: "",
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
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
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) =>
                setFormData({ ...formData, departmentId: e.target.value })
              }
              disabled={!formData.branchId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">
                {formData.branchId
                  ? "Select department"
                  : "Select branch first"}
              </option>
              {availableDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
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
              resetForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
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
              Training Type Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedTrainingType?.name}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedTrainingType && (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedTrainingType.name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Branch</p>
                <p className="text-sm text-gray-600">
                  {selectedTrainingType.branchName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-sm text-gray-600">
                  {selectedTrainingType.departmentName}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm text-gray-600">
                {selectedTrainingType.description}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created At</p>
              <p className="text-sm text-gray-600">
                {new Date(selectedTrainingType.createdAt).toLocaleDateString()}
              </p>
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
              if (selectedTrainingType) openEditModal(selectedTrainingType);
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
            Delete Training Type
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedTrainingType?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
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
  // RENDER
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
            onClick={() => navigate("/training")}
            className="hover:text-gray-700"
          >
            Training
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">System Setup</span>
          <span>›</span>
          <span className="text-gray-900 font-medium">Training Types</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Training Types
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
                placeholder="Search training types..."
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
                      Branch
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    All Branches
                  </button>
                  {branchOptions.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setShowFilters(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      {b.name}
                    </button>
                  ))}
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
                <SortHeader field="name" label="Name" />
                <SortHeader field="branchName" label="Branch" />
                <SortHeader field="departmentName" label="Department" />
                <SortHeader field="description" label="Description" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedTypes.map((type) => (
                <tr
                  key={type.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(type)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {type.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {type.branchName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {type.departmentName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-md truncate">
                    {truncate(type.description, 70)}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(type)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(type)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(type)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedTypes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No training types found.
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
            {filteredTypes.length === 0 ? 0 : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredTypes.length)} of{" "}
            {filteredTypes.length} results
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

export default TrainingTypesSetup;
