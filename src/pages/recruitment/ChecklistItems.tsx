/**
 * File: src/pages/recruitment/ChecklistItems.tsx
 * Manage Checklist Items – full CRUD wired to /recruitment/checklist-items.
 * A checklist item is a task that belongs to an onboarding checklist
 * (task name, category, assigned role, due day, required flag, status).
 * Design matches JobLocations / CandidateAssessments (same list + modals).
 */

import React, { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toArray } from "@/services/_http";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
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
  Globe,
  CheckCircle,
  XCircle,
  ListChecks,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  taskName: string;
  description: string;
  category: string;
  assignedToRole: string;
  dueDay: number | "";
  isRequired: boolean;
  status: boolean; // true = Active
  checklistId: string;
  checklistName: string;
  createdAt: string;
}

interface ChecklistOption {
  id: string;
  name: string;
}

const sampleItems: ChecklistItem[] = [
  {
    id: "s1",
    taskName: "Sign employment contract",
    description: "New hire signs and returns the employment agreement.",
    category: "Legal",
    assignedToRole: "HR",
    dueDay: 1,
    isRequired: true,
    status: true,
    checklistId: "",
    checklistName: "Onboarding",
    createdAt: "2026-01-01",
  },
  {
    id: "s2",
    taskName: "Set up workstation",
    description: "Provision laptop, accounts and access.",
    category: "IT",
    assignedToRole: "IT Admin",
    dueDay: 2,
    isRequired: true,
    status: true,
    checklistId: "",
    checklistName: "Onboarding",
    createdAt: "2026-01-01",
  },
];

type SortField = "taskName" | "checklistName" | "category" | "dueDay" | "status";
type SortDir = "asc" | "desc";

const mapItem = (d: any): ChecklistItem => {
  const ck = d.checklist_id;
  const ckObj = ck && typeof ck === "object";
  return {
    id: String(d._id),
    taskName: d.task_name ?? "",
    description: d.description ?? "",
    category: d.category ?? "",
    assignedToRole: d.assigned_to_role ?? "",
    dueDay: typeof d.due_day === "number" ? d.due_day : "",
    isRequired: !!d.is_required,
    status: d.status !== false,
    checklistId: ckObj ? String(ck._id) : "",
    checklistName: ckObj ? ck.name ?? "" : String(ck ?? ""),
    createdAt: d.createdAt ? String(d.createdAt).slice(0, 10) : "",
  };
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const ChecklistItems: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>(sampleItems);
  const [checklists, setChecklists] = useState<ChecklistOption[]>([]);

  const loadItems = () => {
    api.raw
      .get("/recruitment/checklist-items/all")
      .then((res) => {
        const arr = toArray<any>(res.data);
        setItems(arr.length ? arr.map(mapItem) : []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadItems();
    api.raw
      .get("/recruitment/onboarding-checklists/all")
      .then((res) => {
        const arr = toArray<any>(res.data);
        setChecklists(
          arr.map((c: any) => ({ id: String(c._id), name: c.name ?? "Untitled" })),
        );
      })
      .catch(() => {});
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("taskName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [requiredFilter, setRequiredFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const emptyForm = {
    taskName: "",
    description: "",
    category: "",
    assignedToRole: "",
    dueDay: "" as number | "",
    isRequired: true,
    status: true,
    checklistId: "",
  };
  const [formData, setFormData] = useState({ ...emptyForm });

  // ─── Sorting & Filtering ───────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (it) =>
          it.taskName.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.checklistName.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All")
      result = result.filter((it) => (it.status ? "Active" : "Inactive") === statusFilter);
    if (requiredFilter !== "All")
      result = result.filter((it) => (it.isRequired ? "Required" : "Optional") === requiredFilter);
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
  }, [items, searchQuery, statusFilter, requiredFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredItems.length / perPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetForm = () => setFormData({ ...emptyForm });

  const openCreateModal = () => {
    resetForm();
    setFormData((f) => ({ ...f, checklistId: checklists[0]?.id ?? "" }));
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (item: ChecklistItem) => {
    setSelectedItem(item);
    setFormData({
      taskName: item.taskName,
      description: item.description,
      category: item.category,
      assignedToRole: item.assignedToRole,
      dueDay: item.dueDay,
      isRequired: item.isRequired,
      status: item.status,
      checklistId: item.checklistId || checklists[0]?.id || "",
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (item: ChecklistItem) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const openDeleteModal = (item: ChecklistItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const buildBody = () => ({
    task_name: formData.taskName.trim(),
    description: formData.description.trim() || undefined,
    category: formData.category.trim() || undefined,
    assigned_to_role: formData.assignedToRole.trim() || undefined,
    due_day: formData.dueDay === "" ? undefined : Number(formData.dueDay),
    is_required: formData.isRequired,
    status: formData.status,
    checklist_id: formData.checklistId,
  });

  const handleSave = async () => {
    if (!formData.taskName.trim()) {
      showToast("Please enter a task name", "info");
      return;
    }
    if (!formData.checklistId) {
      showToast("Please select a checklist", "info");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && selectedItem) {
        await api.raw.patch(
          `/recruitment/checklist-items/edit/${selectedItem.id}`,
          buildBody(),
        );
        showToast("Checklist item updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await api.raw.post("/recruitment/checklist-items/create", buildBody());
        showToast("Checklist item created successfully!", "success");
        setShowCreateModal(false);
      }
      loadItems();
      resetForm();
    } catch {
      showToast("Could not save the checklist item", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await api.raw.delete(`/recruitment/checklist-items/delete/${selectedItem.id}`);
      showToast("Checklist item deleted successfully!", "success");
      loadItems();
    } catch {
      showToast("Could not delete the checklist item", "error");
    } finally {
      setShowDeleteModal(false);
      setSelectedItem(null);
    }
  };

  // ─── Sort Header Component ──────────────────────────────────────────────────

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
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
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Edit Checklist Item" : "Create Checklist Item"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing ? "Update task information" : "Add a new checklist task"}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
            <input
              type="text"
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              placeholder="e.g., Sign employment contract"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Checklist *</label>
            <select
              value={formData.checklistId}
              onChange={(e) => setFormData({ ...formData, checklistId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select a checklist…</option>
              {checklists.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {checklists.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No onboarding checklists found — create one first.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Legal"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Role</label>
              <input
                type="text"
                value={formData.assignedToRole}
                onChange={(e) => setFormData({ ...formData, assignedToRole: e.target.value })}
                placeholder="e.g., HR"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Day</label>
              <input
                type="number"
                min={0}
                value={formData.dueDay}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueDay: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                placeholder="e.g., 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <button
              onClick={() => setFormData({ ...formData, status: !formData.status })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.status ? "bg-green-600" : "bg-gray-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.status ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
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
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : isEditing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );

  const ViewModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Checklist Item Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">{selectedItem?.taskName}</p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedItem && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Task Name</p>
                <p className="text-sm font-medium text-gray-900">{selectedItem.taskName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Checklist</p>
                <p className="text-sm text-gray-600">{selectedItem.checklistName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm text-gray-600">{selectedItem.category || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">{selectedItem.description || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assigned Role</p>
                <p className="text-sm text-gray-600">{selectedItem.assignedToRole || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Due Day</p>
                <p className="text-sm text-gray-600">
                  {selectedItem.dueDay === "" ? "—" : selectedItem.dueDay}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Required</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {selectedItem.isRequired ? "Required" : "Optional"}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${selectedItem.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  {selectedItem.status ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {selectedItem.status ? "Active" : "Inactive"}
                </span>
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
              if (selectedItem) openEditModal(selectedItem);
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
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Checklist Item</h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedItem?.taskName}</span>? This action cannot be
            undone.
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate("/")} className="hover:text-gray-700">
              Dashboard
            </button>
            <span>›</span>
            <button onClick={() => navigate("/recruitment")} className="hover:text-gray-700">
              Recruitment
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">Checklist Items</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>ga English</span>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Checklist Items</h2>
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
                placeholder="Search Checklist Items..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
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
                    <span className="text-xs font-medium text-gray-500">Status</span>
                  </div>
                  {["All", "Active", "Inactive"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 my-1"></div>
                  <div className="px-3 pb-1.5 mb-1">
                    <span className="text-xs font-medium text-gray-500">Required</span>
                  </div>
                  {["All", "Required", "Optional"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setRequiredFilter(s);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full px-3 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50"
                  >
                    Apply
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
                <SortHeader field="taskName" label="Task" />
                <SortHeader field="checklistName" label="Checklist" />
                <SortHeader field="category" label="Category" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Role</th>
                <SortHeader field="dueDay" label="Due Day" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Required</th>
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedItems.map((it) => (
                <tr
                  key={it.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(it)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-3.5 h-3.5 text-gray-400" />
                      {it.taskName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{it.checklistName || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{it.category || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{it.assignedToRole || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{it.dueDay === "" ? "—" : it.dueDay}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {it.isRequired ? "Required" : "Optional"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${it.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {it.status ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {it.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(it)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(it)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(it)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No checklist items found.
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
            Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to{" "}
            {Math.min(currentPage * perPage, filteredItems.length)} of {filteredItems.length} results
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
              else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i;
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

      {/* Modals */}
      {(showCreateModal || showEditModal) && CreateEditModal()}
      {showViewModal && ViewModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};

export default ChecklistItems;
