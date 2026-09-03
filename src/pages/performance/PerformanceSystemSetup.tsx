/**
 * File: src/pages/performance/PerformanceSystemSetup.tsx
 * Performance System Setup page – manages Indicator Categories and Goal Types.
 * Design 100% matches the provided screenshot and HRM code style.
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { useResourceData } from "@/hooks/useResourceData";
import {
  indicatorCategoryHooks,
  goalTypeHooks,
  type IndicatorCategory as ApiIndicatorCategory,
  type GoalType as ApiGoalType,
} from "@/services/performance";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Globe,
  Target,
  BarChart3,
  CalendarDays,
  Settings2,
  FileCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Sample Data (offline fallback seeds, API shape) ─────────────────────────

const sampleCategories: ApiIndicatorCategory[] = [
  { id: "1", name: "Leadership & Mentoring", description: "Ability to guide teams, develop others, and drive results", status: "active" },
  { id: "2", name: "Customer Focus & Service", description: "Customer orientation and service delivery", status: "active" },
  { id: "3", name: "Problem Solving & Critical Thinking", description: "Analytical approach to challenges and solution development", status: "active" },
  { id: "4", name: "Productivity & Efficiency", description: "Output volume, task completion rate, and resource optimization", status: "active" },
  { id: "5", name: "Professional Growth & Development", description: "Continuous learning and skill development", status: "inactive" },
  { id: "6", name: "Team Collaboration", description: "Contribution to team success and cross-functional cooperation", status: "active" },
  { id: "7", name: "Time Management & Organization", description: "Prioritization skills, deadline adherence, and workflow efficiency", status: "active" },
  { id: "8", name: "Work Quality & Accuracy", description: "Precision, attention to detail, and error-free delivery", status: "active" },
];

const sampleGoalTypes: ApiGoalType[] = [
  { id: "1", name: "Work Quality & Accuracy", description: "Precision, attention to detail, and error-free delivery", status: "active" },
  { id: "2", name: "Productivity & Efficiency", description: "Output volume, task completion rate, and resource optimization", status: "active" },
  { id: "3", name: "Communication & Interpersonal Skills", description: "Clarity in communication and relationship building", status: "inactive" },
  { id: "4", name: "Team Collaboration", description: "Contribution to team success and cross-functional cooperation", status: "active" },
  { id: "5", name: "Problem Solving & Critical Thinking", description: "Analytical approach to challenges and solution development", status: "active" },
  { id: "6", name: "Leadership & Mentoring", description: "Ability to guide teams, develop others, and drive results", status: "active" },
  { id: "7", name: "Innovation & Process Improvement", description: "Creative thinking and contribution to operational enhancements", status: "inactive" },
  { id: "8", name: "Time Management & Organization", description: "Prioritization skills, deadline adherence, and workflow efficiency", status: "active" },
];

// ─── API ↔ display mapping ────────────────────────────────────────────────────

function mapItem(p: any): CategoryItem {
  const rawStatus = (p.status ?? "active") as string;
  return {
    id: String(p.id ?? p._id ?? ""),
    name: p.name ?? "",
    description: p.description ?? "",
    isActive: rawStatus.toLowerCase() !== "inactive",
    createdAt: (p.createdAt ?? p.created_at ?? "").slice(0, 10),
  };
}

// ─── Module Type Definition ──────────────────────────────────────────────────

type ModuleType =
  | "indicatorCategories"
  | "goalTypes"
  | "kpis"
  | "reviewCycles"
  | "feedbackTemplates";

// ─── Main Component ──────────────────────────────────────────────────────────

export const PerformanceSystemSetup: React.FC = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<ModuleType>("indicatorCategories");

  // ── Indicator Categories data ────────────────────────────────────────────
  const {
    items: rawCategories,
    create: createCategory,
    update: updateCategory,
    remove: removeCategory,
  } = useResourceData(indicatorCategoryHooks, {
    seed: sampleCategories,
    params: { page: 1, limit: 100 },
  });
  const categories = useMemo(() => rawCategories.map(mapItem), [rawCategories]);

  // ── Goal Types data ──────────────────────────────────────────────────────
  const {
    items: rawGoalTypes,
    create: createGoalType,
    update: updateGoalType,
    remove: removeGoalType,
  } = useResourceData(goalTypeHooks, {
    seed: sampleGoalTypes,
    params: { page: 1, limit: 100 },
  });
  const goalTypes = useMemo(() => rawGoalTypes.map(mapItem), [rawGoalTypes]);

  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  // ─── Filtered Data ─────────────────────────────────────────────────────────

  const filteredCategories = categories.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredGoalTypes = goalTypes.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ─── CRUD Handlers ─────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: "", description: "", isActive: true });
    setShowModal(true);
  };

  const openEditModal = (item: CategoryItem) => {
    setIsEditing(true);
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const toApiStatus = (isActive: boolean): "active" | "inactive" =>
    isActive ? "active" : "inactive";

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast("Please enter a name", "info");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      status: toApiStatus(formData.isActive),
    };

    try {
      if (isEditing && editingId) {
        if (activeModule === "indicatorCategories") {
          await updateCategory(editingId, payload as Partial<ApiIndicatorCategory>);
        } else {
          await updateGoalType(editingId, payload as Partial<ApiGoalType>);
        }
        showToast(
          `${activeModule === "indicatorCategories" ? "Indicator category" : "Goal type"} updated successfully!`,
          "success",
        );
      } else {
        if (activeModule === "indicatorCategories") {
          await createCategory(payload as Partial<ApiIndicatorCategory>);
        } else {
          await createGoalType(payload as Partial<ApiGoalType>);
        }
        showToast(
          `${activeModule === "indicatorCategories" ? "Indicator category" : "Goal type"} created successfully!`,
          "success",
        );
      }
      setShowModal(false);
      resetForm();
    } catch {
      showToast("Could not save. Please try again.", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      if (activeModule === "indicatorCategories") {
        await removeCategory(id);
      } else {
        await removeGoalType(id);
      }
      showToast("Deleted successfully!", "success");
    } catch {
      showToast("Could not delete. Please try again.", "error");
    }
  };

  const toggleStatus = async (item: CategoryItem) => {
    const payload = { status: toApiStatus(!item.isActive) };
    try {
      if (activeModule === "indicatorCategories") {
        await updateCategory(item.id, payload as Partial<ApiIndicatorCategory>);
      } else {
        await updateGoalType(item.id, payload as Partial<ApiGoalType>);
      }
      showToast(
        `${!item.isActive ? "Activated" : "Deactivated"} successfully!`,
        "success",
      );
    } catch {
      showToast("Could not update status.", "error");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", isActive: true });
  };

  // ─── Determine active list ─────────────────────────────────────────────────

  const activeList =
    activeModule === "indicatorCategories" ? filteredCategories : filteredGoalTypes;
  const totalList =
    activeModule === "indicatorCategories" ? categories : goalTypes;
  const entityLabel =
    activeModule === "indicatorCategories" ? "indicator category" : "goal type";
  const entityLabelPlural =
    activeModule === "indicatorCategories" ? "indicator categories" : "goal types";

  // ─── Modal ────────────────────────────────────────────────────────────────

  const renderModal = () => {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {isEditing ? `Edit ${entityLabel}` : `Create ${entityLabel}`}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditing ? "Update information" : `Add a new ${entityLabel}`}
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(false);
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
                placeholder="e.g., Work Quality & Accuracy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                rows={3}
                placeholder="Describe..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isActive: e.target.value === "active",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowModal(false);
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
  };

  // ─── Render Module Content ─────────────────────────────────────────────────

  const renderMasterTable = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 capitalize">
          {activeModule === "indicatorCategories" ? "Indicator Categories" : "Goal Types"}
        </h3>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add {activeModule === "indicatorCategories" ? "Category" : "Goal Type"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeList.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-gray-300" />
                    <p>No {entityLabelPlural} found</p>
                    <button
                      onClick={openCreateModal}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Create your first {entityLabel}
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              activeList.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-md truncate">
                    {item.description}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStatus(item)}
                        className="flex items-center gap-1.5 group"
                      >
                        {item.isActive ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {activeList.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50/40 text-xs text-gray-500 flex justify-between items-center">
          <span>
            Showing {activeList.length} of {totalList.length} {entityLabelPlural}
          </span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-600" /> Active
            </span>
            <span className="inline-flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-500" /> Inactive
            </span>
          </span>
        </div>
      )}
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case "indicatorCategories":
      case "goalTypes":
        return renderMasterTable();
      case "kpis":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>KPIs module – coming soon</p>
          </div>
        );
      case "reviewCycles":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Review Cycles module – coming soon</p>
          </div>
        );
      case "feedbackTemplates":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            <FileCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Feedback Templates – coming soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
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
              onClick={() => navigate("/performance")}
              className="hover:text-gray-700"
            >
              Performance
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">System Setup</span>
            <span>›</span>
            <span className="text-gray-900 font-medium">
              {activeModule === "indicatorCategories" ? "Indicator Categories" : "Goal Types"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>ga English</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Performance Setup
            </h3>
            {/* Search */}
            {(activeModule === "indicatorCategories" || activeModule === "goalTypes") && (
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md"
                />
              </div>
            )}
            <nav className="space-y-1">
              {[
                { id: "indicatorCategories", label: "Indicator Categories", icon: Settings2 },
                { id: "goalTypes", label: "Goal Types", icon: Target },
                { id: "kpis", label: "KPIs", icon: BarChart3 },
                { id: "reviewCycles", label: "Review Cycles", icon: CalendarDays },
                { id: "feedbackTemplates", label: "Feedback Templates", icon: FileCheck },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id as ModuleType);
                    setSearchTerm("");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    activeModule === item.id
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderModuleContent()}
        </div>
      </div>

      {/* Modal */}
      {showModal && renderModal()}
    </div>
  );
};

export default PerformanceSystemSetup;
