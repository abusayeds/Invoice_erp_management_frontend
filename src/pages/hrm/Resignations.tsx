/**
 * File: src/pages/hrm/Resignations.tsx
 * Complete Resignations Management page with list view, create/edit modal, and details modal
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
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  UserMinus,
} from "lucide-react";
import { useResourceData } from "@/hooks/useResourceData";
import { resignationHooks, employeeHooks, hrmStatusActions } from "@/services/hrm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Resignation {
  id: string;
  employeeId?: string;
  employee: string;
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
  description: string;
  document: string;
  status: "Pending" | "Accepted" | "Rejected" | "Cancelled";
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleResignations: Resignation[] = [
  {
    id: "1",
    employee: "Mark Allen",
    resignationDate: "2026-01-19",
    lastWorkingDate: "2026-02-19",
    reason:
      "Career pivot opportunity leveraging transferable skills in new industry sector with growth potential and innovation.",
    description:
      "Additional details regarding resignation process and transition planning for smooth handover.",
    document: "resignation_letter_mark.pdf",
    status: "Pending",
    approvedBy: "",
    approvedAt: "",
    createdAt: "2026-01-19",
  },
  {
    id: "2",
    employee: "Anthony Walker",
    resignationDate: "2026-01-14",
    lastWorkingDate: "2026-02-14",
    reason:
      "Company culture mismatch resolution through transition to organization with better alignment of values and practices.",
    description: "Seeking a more collaborative work environment.",
    document: "resignation_letter_anthony.pdf",
    status: "Accepted",
    approvedBy: "HR Manager",
    approvedAt: "2026-01-16",
    createdAt: "2026-01-14",
  },
  {
    id: "3",
    employee: "Matthew Clark",
    resignationDate: "2026-01-09",
    lastWorkingDate: "2026-02-09",
    reason:
      "Skill diversification pursuit requiring exposure to different business functions and cross-functional collaboration experience.",
    description: "Looking for opportunities in different industries.",
    document: "resignation_letter_matthew.pdf",
    status: "Accepted",
    approvedBy: "HR Director",
    approvedAt: "2026-01-11",
    createdAt: "2026-01-09",
  },
  {
    id: "4",
    employee: "Daniel Thompson",
    resignationDate: "2026-01-04",
    lastWorkingDate: "2026-02-04",
    reason:
      "Professional network expansion and career advancement in emerging market with promising growth trajectory.",
    description: "Moving to a startup with better growth potential.",
    document: "resignation_letter_daniel.pdf",
    status: "Accepted",
    approvedBy: "HR Manager",
    approvedAt: "2026-01-06",
    createdAt: "2026-01-04",
  },
  {
    id: "5",
    employee: "Christopher Lee",
    resignationDate: "2025-12-30",
    lastWorkingDate: "2026-01-30",
    reason:
      "Work schedule constraints impacting work-life balance and personal well-being.",
    description: "Need more flexible working hours.",
    document: "resignation_letter_christopher.pdf",
    status: "Rejected",
    approvedBy: "HR Manager",
    approvedAt: "2026-01-02",
    createdAt: "2025-12-30",
  },
  {
    id: "6",
    employee: "James Garcia",
    resignationDate: "2025-12-25",
    lastWorkingDate: "2026-01-25",
    reason:
      "Leadership role opportunity offering strategic decision-making authority and executive-level responsibilities.",
    description: "Offered a leadership position at another company.",
    document: "resignation_letter_james.pdf",
    status: "Accepted",
    approvedBy: "CEO",
    approvedAt: "2025-12-27",
    createdAt: "2025-12-25",
  },
  {
    id: "7",
    employee: "Robert Taylor",
    resignationDate: "2025-12-20",
    lastWorkingDate: "2026-01-20",
    reason:
      "Technology industry shift following specialized skill development in cutting-edge domains.",
    description: "Moving to a tech-focused company.",
    document: "resignation_letter_robert.pdf",
    status: "Accepted",
    approvedBy: "HR Manager",
    approvedAt: "2025-12-22",
    createdAt: "2025-12-20",
  },
  {
    id: "8",
    employee: "David Wilson",
    resignationDate: "2025-12-15",
    lastWorkingDate: "2026-01-15",
    reason:
      "Non-profit sector transition aligning with personal values and social impact goals for meaningful contribution.",
    description: "Joining a non-profit organization.",
    document: "resignation_letter_david.pdf",
    status: "Accepted",
    approvedBy: "HR Director",
    approvedAt: "2025-12-17",
    createdAt: "2025-12-15",
  },
];

const employees = [
  "Mark Allen",
  "Anthony Walker",
  "Matthew Clark",
  "Daniel Thompson",
  "Christopher Lee",
  "James Garcia",
  "Robert Taylor",
  "David Wilson",
  "Michael Brown",
  "John Smith",
];

const reasonOptions = [
  "Career pivot opportunity leveraging transferable skills in new industry sector with growth potential and innovation.",
  "Company culture mismatch resolution through transition to organization with better alignment of values and practices.",
  "Skill diversification pursuit requiring exposure to different business functions and cross-functional collaboration experience.",
  "Professional network expansion and career advancement in emerging market with promising growth trajectory.",
  "Work schedule constraints impacting work-life balance and personal well-being.",
  "Leadership role opportunity offering strategic decision-making authority and executive-level responsibilities.",
  "Technology industry shift following specialized skill development in cutting-edge domains.",
  "Non-profit sector transition aligning with personal values and social impact goals for meaningful contribution.",
  "Consulting career launch leveraging accumulated expertise and industry knowledge for independent professional practice.",
];

// ─── Seed (snake_case for API) ────────────────────────────────────────────────

const sampleResignationsSeed = sampleResignations.map((r) => ({
  id: r.id,
  employee_id: r.employee,
  last_working_date: r.lastWorkingDate,
  reason: r.reason,
  description: r.description,
  status: r.status.toLowerCase(),
}));

// ─── mapFromApi ───────────────────────────────────────────────────────────────

type SelectOption = { id: string; name: string };

const employeeOption = (employee: any): SelectOption => ({
  id: String(employee?._id ?? employee?.id ?? employee?.employee_id ?? ""),
  name: String(
    employee?.employee_user_id?.name ??
      employee?.user_id?.name ??
      employee?.name ??
      employee?.employee_name ??
      employee?.first_name ??
      employee?.employee_id ??
      employee?._id ??
      employee?.id ??
      "",
  ),
});

const employeeRefValue = (ref: any) => String(typeof ref === "object" ? ref?._id ?? ref?.id ?? "" : ref ?? "");

const employeeRefLabel = (ref: any, fallback: any = "") =>
  String(
    typeof ref === "object"
      ? ref?.employee_user_id?.name ??
          ref?.user_id?.name ??
          ref?.name ??
          ref?.employee_name ??
          ref?.first_name ??
          ref?.employee_id ??
          ref?._id ??
          ref?.id ??
          ""
      : fallback || ref || "",
  );

function mapFromApi(p: any): Resignation {
  const empField = p.employee_id ?? p.employeeId;
  return {
    id: String(p.id ?? p._id ?? ""),
    employeeId: employeeRefValue(empField),
    employee: employeeRefLabel(empField, p.employee),
    resignationDate: (p.resignation_date ?? p.resignationDate ?? p.createdAt ?? "").slice(0, 10),
    lastWorkingDate: (p.last_working_date ?? p.lastWorkingDate ?? "").slice(0, 10),
    reason: p.reason ?? "",
    description: p.description ?? "",
    document: p.document ?? "",
    status: (() => {
      const s = (p.status ?? "pending").toLowerCase();
      if (s === "accepted") return "Accepted";
      if (s === "rejected") return "Rejected";
      if (s === "cancelled") return "Cancelled";
      return "Pending";
    })() as Resignation["status"],
    approvedBy: refLabel(p.approved_by ?? p.approvedBy),
    approvedAt: (p.approved_at ?? p.approvedAt ?? "").slice(0, 10),
    createdAt: (p.createdAt ?? p.created_at ?? "").slice(0, 10),
  };
}

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

type SortField = "employee" | "resignationDate" | "lastWorkingDate" | "status";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const Resignations: React.FC = () => {
  const navigate = useNavigate();

  const { items: raw, create, update, remove, refetch } = useResourceData(
    resignationHooks,
    { seed: sampleResignationsSeed as any, params: { page: 1, limit: 100 } },
  );
  const resignations = useMemo(() => raw.map(mapFromApi), [raw]);

  // Employee options from API
  const empQuery = employeeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const empOptions = useMemo(
    () =>
      (empQuery.data ?? [])
        .map(employeeOption)
        .filter((option) => option.id && option.name),
    [empQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("resignationDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedResignation, setSelectedResignation] =
    useState<Resignation | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [resignationFormData, setResignationFormData] = useState({
    employee: "",
    lastWorkingDate: "",
    reason: "",
    description: "",
    document: null as File | null,
    documentName: "",
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

  const filteredResignations = useMemo(() => {
    let result = [...resignations];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.employee.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((r) => r.status === statusFilter);
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
  }, [resignations, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredResignations.length / perPage);
  const paginatedResignations = filteredResignations.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResignationFormData({
        ...resignationFormData,
        document: e.target.files[0],
        documentName: e.target.files[0].name,
      });
    }
  };

  const resetResignationForm = () => {
    setResignationFormData({
      employee: "",
      lastWorkingDate: "",
      reason: "",
      description: "",
      document: null,
      documentName: "",
    });
  };

  const openCreateModal = () => {
    resetResignationForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (resignation: Resignation) => {
    setSelectedResignation(resignation);
    setResignationFormData({
      employee: resignation.employeeId || resignation.employee,
      lastWorkingDate: resignation.lastWorkingDate,
      reason: resignation.reason,
      description: resignation.description,
      document: null,
      documentName: resignation.document,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (resignation: Resignation) => {
    setSelectedResignation(resignation);
    setShowViewModal(true);
  };

  const openDeleteModal = (resignation: Resignation) => {
    setSelectedResignation(resignation);
    setShowDeleteModal(true);
  };

  const handleStatusUpdate = async (
    id: string,
    newStatus: "Accepted" | "Rejected",
  ) => {
    try {
      await hrmStatusActions.resignation(id, newStatus.toLowerCase());
      refetch();
      showToast(`Resignation ${newStatus.toLowerCase()} successfully!`, "success");
    } catch {
      showToast("Action failed.", "error");
    }
  };

  const handleSaveResignation = async () => {
    if (!resignationFormData.employee) {
      showToast("Please select an employee", "info");
      return;
    }
    if (!resignationFormData.lastWorkingDate) {
      showToast("Please select last working date", "info");
      return;
    }
    if (!resignationFormData.reason) {
      showToast("Please enter a reason", "info");
      return;
    }

    const payload = {
      employee_id: resignationFormData.employee,
      last_working_date: resignationFormData.lastWorkingDate,
      reason: resignationFormData.reason,
      description: resignationFormData.description,
    };

    try {
      if (isEditing && selectedResignation) {
        await update(selectedResignation.id, payload);
        showToast("Resignation updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(payload);
        showToast("Resignation created successfully!", "success");
        setShowCreateModal(false);
      }
      resetResignationForm();
    } catch {
      showToast("Operation failed.", "error");
    }
  };

  const handleDeleteResignation = async () => {
    if (selectedResignation) {
      try {
        await remove(selectedResignation.id);
        showToast("Resignation deleted successfully!", "success");
        setShowDeleteModal(false);
        setSelectedResignation(null);
      } catch {
        showToast("Delete failed.", "error");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-yellow-100 text-yellow-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      case "Cancelled":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted":
        return <CheckCircle className="w-3 h-3" />;
      case "Pending":
        return <Clock className="w-3 h-3" />;
      case "Rejected":
        return <X className="w-3 h-3" />;
      case "Cancelled":
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
              {isEditing ? "Edit Resignation" : "Create Resignation"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update resignation information"
                : "Add a new resignation"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetResignationForm();
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
              value={resignationFormData.employee}
              onChange={(e) =>
                setResignationFormData({
                  ...resignationFormData,
                  employee: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Employee</option>
              {empOptions.length > 0
                ? empOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))
                : employees.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Working Date *
            </label>
            <input
              type="date"
              value={resignationFormData.lastWorkingDate}
              onChange={(e) =>
                setResignationFormData({
                  ...resignationFormData,
                  lastWorkingDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason *
            </label>
            <select
              value={resignationFormData.reason}
              onChange={(e) =>
                setResignationFormData({
                  ...resignationFormData,
                  reason: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Reason</option>
              {reasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.length > 60
                    ? reason.substring(0, 60) + "..."
                    : reason}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={resignationFormData.description}
              onChange={(e) =>
                setResignationFormData({
                  ...resignationFormData,
                  description: e.target.value,
                })
              }
              rows={3}
              placeholder="Enter Description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.png,.docx"
                className="hidden"
                id="document-upload"
              />
              <button
                onClick={() =>
                  document.getElementById("document-upload")?.click()
                }
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                <Upload className="w-4 h-4" />
                Browse
              </button>
              {resignationFormData.documentName && (
                <span className="text-sm text-green-600">
                  {resignationFormData.documentName}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetResignationForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveResignation}
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
              Resignation Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedResignation?.employee}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedResignation && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedResignation.employee}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedResignation.status)}`}
              >
                {getStatusIcon(selectedResignation.status)}
                {selectedResignation.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Resignation Date</p>
              <p className="text-sm text-gray-600">
                {formatDate(selectedResignation.resignationDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Working Date</p>
              <p className="text-sm text-gray-600">
                {formatDate(selectedResignation.lastWorkingDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Reason</p>
              <p className="text-sm text-gray-600">
                {selectedResignation.reason}
              </p>
            </div>
            {selectedResignation.description && (
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">
                  {selectedResignation.description}
                </p>
              </div>
            )}
            {selectedResignation.approvedBy && (
              <div>
                <p className="text-xs text-gray-500">Approved By</p>
                <p className="text-sm text-gray-600">
                  {selectedResignation.approvedBy} at{" "}
                  {formatDate(selectedResignation.approvedAt)}
                </p>
              </div>
            )}
            {selectedResignation.document && (
              <div>
                <p className="text-xs text-gray-500">Document</p>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  {selectedResignation.document}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between gap-3">
          <div className="flex gap-2">
            {selectedResignation?.status === "Pending" && (
              <>
                <button
                  onClick={() => {
                    if (selectedResignation)
                      handleStatusUpdate(selectedResignation.id, "Accepted");
                    setShowViewModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Accept
                </button>
                <button
                  onClick={() => {
                    if (selectedResignation)
                      handleStatusUpdate(selectedResignation.id, "Rejected");
                    setShowViewModal(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Reject
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
                if (selectedResignation) openEditModal(selectedResignation);
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
            Delete Resignation
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete this resignation for{" "}
            <span className="font-semibold">
              {selectedResignation?.employee}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteResignation}
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
            onClick={() => navigate("/hrm")}
            className="hover:text-gray-700"
          >
            HRM
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Resignations</span>
        </div>
      </div>
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Resignations
          </h2>
          <button
            onClick={openCreateModal}
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
                placeholder="Search Resignations..."
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
                      setStatusFilter("Pending");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Accepted");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Accepted
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Rejected");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Rejected
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="employee" label="Employee" />
                <SortHeader field="resignationDate" label="Date" />
                <SortHeader field="lastWorkingDate" label="Last Working" />
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedResignations.map((resignation) => (
                <tr
                  key={resignation.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(resignation)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserMinus className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {resignation.employee}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(resignation.resignationDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(resignation.lastWorkingDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(resignation.status)}`}
                    >
                      {getStatusIcon(resignation.status)}
                      {resignation.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {resignation.document ? (
                      <FileText className="w-4 h-4 text-blue-500" />
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(resignation)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(resignation)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(resignation)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedResignations.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No resignations found.
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
            {filteredResignations.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredResignations.length)} of{" "}
            {filteredResignations.length} results
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
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
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
