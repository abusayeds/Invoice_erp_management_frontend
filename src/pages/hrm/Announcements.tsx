/**
 * File: src/pages/hrm/Announcements.tsx
 * Complete Announcements Management page with list view, create/edit modal, and details modal
 * Based on provided screenshots design
 */

import React, { useState, useMemo } from "react";
import { refLabel } from "@/services/_http";
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
  AlertCircle,
  CheckCircle,
  Clock,
  Flag,
} from "lucide-react";
import { useResourceData } from "@/hooks/useResourceData";
import {
  announcementHooks,
  announcementCategoryHooks,
  departmentHooks,
  hrmStatusActions,
} from "@/services/hrm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  category: string;
  department: string[];
  startDate: string;
  endDate: string;
  priority: "High" | "Medium" | "Low";
  status: "Active" | "Draft" | "Inactive";
  description: string;
  approvedBy: string;
  createdAt: string;
}

// ─── Sample Data (API-shaped seed) ───────────────────────────────────────────

const sampleAnnouncementsSeed = [
  {
    id: "1",
    title: "Year-End Performance Bonus Distribution",
    announcement_category_id: "General Company Information",
    departments: ["Quality Assurance", "Customer Service"],
    start_date: "2026-01-13",
    end_date: "2026-03-28",
    priority: "High",
    status: "Active",
    description:
      "Annual performance bonus calculation and distribution based on individual achievements, department goals, and company performance metrics for eligible employees.",
  },
  {
    id: "2",
    title: "Digital Communication Platform Launch",
    announcement_category_id: "Vendor & Supplier Communications",
    departments: ["IT", "Marketing"],
    start_date: "2026-01-07",
    end_date: "2026-04-12",
    priority: "Medium",
    status: "Draft",
    description:
      "Launch of new digital communication platform for improved collaboration.",
  },
  {
    id: "3",
    title: "Company Social Responsibility Initiative",
    announcement_category_id: "Social & Community Engagement",
    departments: ["HR", "Administration"],
    start_date: "2026-01-02",
    end_date: "2026-08-30",
    priority: "Low",
    status: "Active",
    description: "CSR initiative focusing on community development.",
  },
  {
    id: "4",
    title: "Leadership Development Program",
    announcement_category_id: "Career Development Opportunities",
    departments: ["Human Resources", "Executive"],
    start_date: "2025-12-29",
    end_date: "2026-01-27",
    priority: "Medium",
    status: "Inactive",
    description: "Leadership training program for emerging leaders.",
  },
  {
    id: "5",
    title: "Workplace Safety Inspection Schedule",
    announcement_category_id: "Performance Review & Feedback",
    departments: ["Operations", "Facilities"],
    start_date: "2025-12-24",
    end_date: "2027-02-11",
    priority: "High",
    status: "Active",
    description: "Regular workplace safety inspections.",
  },
  {
    id: "6",
    title: "Cross-Department Collaboration Project",
    announcement_category_id: "Remote Work & Flexibility Updates",
    departments: ["Sales", "Marketing"],
    start_date: "2025-12-18",
    end_date: "2026-05-07",
    priority: "Medium",
    status: "Active",
    description: "Cross-departmental collaboration initiative.",
  },
  {
    id: "7",
    title: "Technology Upgrade Implementation",
    announcement_category_id: "Diversity & Inclusion Initiatives",
    departments: ["IT", "Finance"],
    start_date: "2025-12-14",
    end_date: "2026-07-11",
    priority: "High",
    status: "Draft",
    description: "Major technology infrastructure upgrade.",
  },
  {
    id: "8",
    title: "Employee Feedback Survey Campaign",
    announcement_category_id: "Emergency & Crisis Communications",
    departments: ["HR", "Administration"],
    start_date: "2025-12-09",
    end_date: "2026-03-13",
    priority: "Medium",
    status: "Active",
    description: "Annual employee feedback survey.",
  },
  {
    id: "9",
    title: "Quality Management System Certification",
    announcement_category_id: "Market & Industry Insights",
    departments: ["Quality Assurance", "Operations"],
    start_date: "2025-12-03",
    end_date: "2026-06-11",
    priority: "High",
    status: "Active",
    description: "ISO certification process and training.",
  },
];

const priorities = ["High", "Medium", "Low"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapFromApi(p: any): Announcement {
  const acRef = p.announcement_category_id;
  const depts = p.departments ?? p.department ?? [];
  return {
    id: String(p.id ?? p._id ?? ""),
    title: p.title ?? "",
    category:
      typeof acRef === "object"
        ? acRef?.name ?? String(acRef?._id ?? "")
        : String(acRef ?? p.category ?? ""),
    department: Array.isArray(depts)
      ? depts.map((d: any) =>
          typeof d === "object" ? d?.department_name ?? d?.name ?? String(d?._id ?? "") : String(d),
        )
      : [],
    startDate: (p.start_date ?? p.startDate ?? "").slice(0, 10),
    endDate: (p.end_date ?? p.endDate ?? "").slice(0, 10),
    priority: p.priority ?? "Medium",
    status: p.status ?? "Draft",
    description: p.description ?? "",
    approvedBy: refLabel(p.approved_by ?? p.approvedBy),
    createdAt: (p.created_at ?? p.createdAt ?? "").slice(0, 10),
  };
}

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
  | "title"
  | "category"
  | "startDate"
  | "endDate"
  | "priority"
  | "status"
  | "approvedBy";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const Announcements: React.FC = () => {
  const navigate = useNavigate();

  const { items: raw, create, update, remove, refetch } = useResourceData(
    announcementHooks,
    { seed: sampleAnnouncementsSeed as any[], params: { page: 1, limit: 100 } },
  );
  const announcements = useMemo(() => raw.map(mapFromApi), [raw]);

  // Load options from API
  const acListResult = announcementCategoryHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const acOptions: string[] = useMemo(() => {
    const data = acListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map((e: any) => e.name ?? String(e._id ?? e.id ?? ""));
  }, [acListResult.data]);

  const deptListResult = departmentHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const deptOptions: string[] = useMemo(() => {
    const data = deptListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map((e: any) => e.department_name ?? e.name ?? String(e._id ?? e.id ?? ""));
  }, [deptListResult.data]);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: "",
    category: "",
    department: [] as string[],
    priority: "Medium" as "High" | "Medium" | "Low",
    startDate: "",
    endDate: "",
    description: "",
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

  const filteredAnnouncements = useMemo(() => {
    let result = [...announcements];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.approvedBy.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (priorityFilter !== "All") {
      result = result.filter((a) => a.priority === priorityFilter);
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
  }, [
    announcements,
    searchQuery,
    statusFilter,
    priorityFilter,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.ceil(filteredAnnouncements.length / perPage);
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const toggleDepartment = (dept: string) => {
    setAnnouncementFormData((prev) => ({
      ...prev,
      department: prev.department.includes(dept)
        ? prev.department.filter((d) => d !== dept)
        : [...prev.department, dept],
    }));
  };

  const resetAnnouncementForm = () => {
    setAnnouncementFormData({
      title: "",
      category: "",
      department: [],
      priority: "Medium",
      startDate: "",
      endDate: "",
      description: "",
    });
  };

  const openCreateModal = () => {
    resetAnnouncementForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setAnnouncementFormData({
      title: announcement.title,
      category: announcement.category,
      department: [...announcement.department],
      priority: announcement.priority,
      startDate: announcement.startDate,
      endDate: announcement.endDate,
      description: announcement.description,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowViewModal(true);
  };

  const openDeleteModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDeleteModal(true);
  };

  const handleStatusUpdate = async (id: string, newStatus: "Active" | "Inactive") => {
    try {
      await hrmStatusActions.announcement(id, newStatus);
      await refetch();
      showToast(
        `Announcement ${newStatus.toLowerCase()}d successfully!`,
        "success",
      );
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementFormData.title) {
      showToast("Please enter title", "info");
      return;
    }
    if (!announcementFormData.category) {
      showToast("Please select category", "info");
      return;
    }
    if (announcementFormData.department.length === 0) {
      showToast("Please select at least one department", "info");
      return;
    }
    if (!announcementFormData.startDate) {
      showToast("Please select start date", "info");
      return;
    }
    if (!announcementFormData.endDate) {
      showToast("Please select end date", "info");
      return;
    }
    if (announcementFormData.startDate > announcementFormData.endDate) {
      showToast("Start date cannot be after end date", "error");
      return;
    }

    const toApi = {
      title: announcementFormData.title,
      announcement_category_id: announcementFormData.category,
      departments: announcementFormData.department,
      description: announcementFormData.description,
      priority: announcementFormData.priority,
      start_date: announcementFormData.startDate,
      end_date: announcementFormData.endDate,
    };

    try {
      if (isEditing && selectedAnnouncement) {
        await update(selectedAnnouncement.id, toApi);
        showToast("Announcement updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(toApi);
        showToast("Announcement created successfully!", "success");
        setShowCreateModal(false);
      }
      resetAnnouncementForm();
    } catch {
      showToast("Failed to save announcement", "error");
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (selectedAnnouncement) {
      try {
        await remove(selectedAnnouncement.id);
        showToast("Announcement deleted successfully!", "success");
        setShowDeleteModal(false);
        setSelectedAnnouncement(null);
      } catch {
        showToast("Failed to delete announcement", "error");
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "Low":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "High":
        return <Flag className="w-3 h-3" />;
      case "Medium":
        return <AlertCircle className="w-3 h-3" />;
      case "Low":
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700";
      case "Draft":
        return "bg-yellow-100 text-yellow-700";
      case "Inactive":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="w-3 h-3" />;
      case "Draft":
        return <Clock className="w-3 h-3" />;
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

  // ─── Fallback option arrays ───────────────────────────────────────────────

  const displayAcOptions = acOptions.length > 0 ? acOptions : [
    "General Company Information", "Vendor & Supplier Communications",
    "Social & Community Engagement", "Career Development Opportunities",
    "Performance Review & Feedback", "Remote Work & Flexibility Updates",
    "Diversity & Inclusion Initiatives", "Emergency & Crisis Communications",
    "Market & Industry Insights",
  ];
  const displayDeptOptions = deptOptions.length > 0 ? deptOptions : [
    "Quality Assurance", "Customer Service", "IT", "Marketing", "HR",
    "Administration", "Human Resources", "Executive", "Operations",
    "Facilities", "Sales", "Finance", "Legal",
  ];

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
              {isEditing ? "Edit Announcement" : "Create Announcement"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update announcement information"
                : "Add a new announcement"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetAnnouncementForm();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={announcementFormData.title}
              onChange={(e) =>
                setAnnouncementFormData({
                  ...announcementFormData,
                  title: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Announcement Category *
            </label>
            <select
              value={announcementFormData.category}
              onChange={(e) =>
                setAnnouncementFormData({
                  ...announcementFormData,
                  category: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Category</option>
              {displayAcOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department *
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {displayDeptOptions.map((dept) => (
                  <label key={dept} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={announcementFormData.department.includes(dept)}
                      onChange={() => toggleDepartment(dept)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-gray-700">{dept}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <div className="flex gap-4">
              {priorities.map((p) => (
                <label key={p} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={announcementFormData.priority === p}
                    onChange={() =>
                      setAnnouncementFormData({
                        ...announcementFormData,
                        priority: p as any,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={announcementFormData.startDate}
                onChange={(e) =>
                  setAnnouncementFormData({
                    ...announcementFormData,
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
                value={announcementFormData.endDate}
                onChange={(e) =>
                  setAnnouncementFormData({
                    ...announcementFormData,
                    endDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={announcementFormData.description}
              onChange={(e) =>
                setAnnouncementFormData({
                  ...announcementFormData,
                  description: e.target.value,
                })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetAnnouncementForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAnnouncement}
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
              Announcement Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedAnnouncement?.title}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedAnnouncement && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Title</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedAnnouncement.title}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAnnouncement.status)}`}
              >
                {getStatusIcon(selectedAnnouncement.status)}
                {selectedAnnouncement.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm text-gray-600">
                  {selectedAnnouncement.category}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedAnnouncement.priority)}`}
                >
                  {getPriorityIcon(selectedAnnouncement.priority)}
                  {selectedAnnouncement.priority}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedAnnouncement.startDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedAnnouncement.endDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Departments</p>
                <p className="text-sm text-gray-600">
                  {selectedAnnouncement.department.join(", ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Approved By</p>
                <p className="text-sm text-gray-600">
                  {selectedAnnouncement.approvedBy || "-"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">
                  {selectedAnnouncement.description}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between gap-3">
          <div className="flex gap-2">
            {selectedAnnouncement?.status === "Draft" && (
              <>
                <button
                  onClick={() => {
                    if (selectedAnnouncement)
                      handleStatusUpdate(selectedAnnouncement.id, "Active");
                    setShowViewModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Activate
                </button>
                <button
                  onClick={() => {
                    if (selectedAnnouncement)
                      handleStatusUpdate(selectedAnnouncement.id, "Inactive");
                    setShowViewModal(false);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Deactivate
                </button>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowViewModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowViewModal(false);
                if (selectedAnnouncement) openEditModal(selectedAnnouncement);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit
            </button>
          </div>
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
            Delete Announcement
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedAnnouncement?.title}</span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteAnnouncement}
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
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => navigate("/")}
            className="hover:text-gray-700"
          >
            Dashboard
          </button>
          <span>›</span>
          <button
            onClick={() => navigate("/hrm")}
            className="hover:text-gray-700"
          >
            HRM
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Announcements</span>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Announcements
          </h2>
          <button
            onClick={openCreateModal}
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Announcements..."
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
                <div className="absolute right-0 top-10 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-3 pb-2 mb-1 border-b border-gray-100">
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
                      setStatusFilter("Draft");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Draft
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
                  <div className="px-3 pb-2 mt-2 mb-1 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500">
                      Priority
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setPriorityFilter("All");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setPriorityFilter("High");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    High
                  </button>
                  <button
                    onClick={() => {
                      setPriorityFilter("Medium");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => {
                      setPriorityFilter("Low");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Low
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <SortHeader field="title" label="Title" />
                <SortHeader field="category" label="Announcement Category" />
                <SortHeader field="startDate" label="Start Date" />
                <SortHeader field="endDate" label="End Date" />
                <SortHeader field="priority" label="Priority" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="approvedBy" label="Approved By" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedAnnouncements.map((ann) => (
                <tr
                  key={ann.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(ann)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {ann.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ann.category}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(ann.startDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(ann.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ann.priority)}`}
                    >
                      {getPriorityIcon(ann.priority)}
                      {ann.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ann.status)}`}
                    >
                      {getStatusIcon(ann.status)}
                      {ann.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ann.approvedBy || "-"}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(ann)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(ann)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(ann)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedAnnouncements.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No announcements found.
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
            {filteredAnnouncements.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredAnnouncements.length)}{" "}
            of {filteredAnnouncements.length} results
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
      {(showCreateModal || showEditModal) && CreateEditModal()}
      {showViewModal && ViewModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};
