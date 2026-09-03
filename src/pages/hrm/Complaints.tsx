/**
 * File: src/pages/hrm/Complaints.tsx
 * Complete Complaints Management page with list view, create/edit modal, and details modal
 * Based on provided screenshots design
 */

import React, { useState, useMemo } from "react";
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
  User,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Flag,
  UserX,
} from "lucide-react";
import { useResourceData } from "@/hooks/useResourceData";
import {
  complaintHooks,
  complaintTypeHooks,
  employeeHooks,
  hrmStatusActions,
} from "@/services/hrm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Complaint {
  id: string;
  employeeId: string;
  employee: string;
  againstEmployeeId: string;
  againstEmployee: string;
  complaintTypeId?: string;
  complaintType: string;
  subject: string;
  description: string;
  complaintDate: string;
  document: string;
  status: "In progress" | "Resolved" | "Assigned" | "Closed" | "Pending";
  resolvedBy: string;
  resolvedAt: string;
  createdAt: string;
}

// ─── Sample Data (API-shaped seed) ───────────────────────────────────────────

const sampleComplaintsSeed = [
  {
    id: "1",
    employee_id: "Mark Allen",
    against_employee_id: "Daniel Thompson",
    complaint_type_id: "General Administrative Issues",
    subject: "Parking and Transportation Issues Resolution",
    description:
      "Parking and transportation issues requiring resolution to improve employee accessibility and convenience.",
    complaint_date: "2026-01-12",
    status: "In progress",
  },
  {
    id: "2",
    employee_id: "Anthony Walker",
    against_employee_id: "John Smith",
    complaint_type_id: "Legal & Regulatory Compliance",
    subject: "Temperature Control - Uncomfortable Working Conditions",
    description:
      "Temperature control issues causing uncomfortable working conditions for employees.",
    complaint_date: "2026-01-07",
    status: "Resolved",
  },
  {
    id: "3",
    employee_id: "Matthew Clark",
    against_employee_id: "Robert Taylor",
    complaint_type_id: "Diversity & Inclusion Concerns",
    subject: "Noise Pollution - Excessive Workplace Disturbance",
    description:
      "Noise pollution from excessive workplace disturbance affecting concentration and productivity during work hours.",
    complaint_date: "2026-01-02",
    status: "In progress",
  },
  {
    id: "4",
    employee_id: "Daniel Thompson",
    against_employee_id: "Michael Brown",
    complaint_type_id: "Remote Work & Flexibility Issues",
    subject: "Ergonomic Issues - Repetitive Strain Injuries",
    description:
      "Ergonomic issues leading to repetitive strain injuries among remote workers.",
    complaint_date: "2025-12-28",
    status: "Assigned",
  },
  {
    id: "5",
    employee_id: "Christopher Lee",
    against_employee_id: "John Smith",
    complaint_type_id: "Security & Access Control",
    subject: "Environmental Health Hazards - Chemical Exposure",
    description:
      "Environmental health hazards from chemical exposure in workplace.",
    complaint_date: "2025-12-23",
    status: "Resolved",
  },
  {
    id: "6",
    employee_id: "James Garcia",
    against_employee_id: "Robert Taylor",
    complaint_type_id: "Environmental & Sustainability Issues",
    subject: "Data Security Breach - Unauthorized Access",
    description:
      "Data security breach due to unauthorized access to confidential information.",
    complaint_date: "2025-12-18",
    status: "Resolved",
  },
  {
    id: "7",
    employee_id: "Robert Taylor",
    against_employee_id: "Anthony Walker",
    complaint_type_id: "Financial & Budget Concerns",
    subject: "Substance Abuse in Workplace Environment",
    description:
      "Substance abuse concerns affecting workplace safety and environment.",
    complaint_date: "2025-12-13",
    status: "In progress",
  },
  {
    id: "8",
    employee_id: "David Wilson",
    against_employee_id: "Michael Brown",
    complaint_type_id: "Customer Service & Relations",
    subject: "Conflict of Interest - Undisclosed Relationships",
    description:
      "Conflict of interest due to undisclosed relationships affecting decision making.",
    complaint_date: "2025-12-08",
    status: "Resolved",
  },
  {
    id: "9",
    employee_id: "Michael Brown",
    against_employee_id: "Anthony Walker",
    complaint_type_id: "Quality & Process Improvement",
    subject: "Misuse of Company Resources and Equipment",
    description:
      "Misuse of company resources and equipment for personal benefit.",
    complaint_date: "2025-12-03",
    status: "Resolved",
  },
];

const subjects = [
  "Parking and Transportation Issues Resolution",
  "Temperature Control - Uncomfortable Working Conditions",
  "Noise Pollution - Excessive Workplace Disturbance",
  "Ergonomic Issues - Repetitive Strain Injuries",
  "Environmental Health Hazards - Chemical Exposure",
  "Data Security Breach - Unauthorized Access",
  "Substance Abuse in Workplace Environment",
  "Conflict of Interest - Undisclosed Relationships",
  "Misuse of Company Resources and Equipment",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SelectOption = { value: string; label: string };

const employeeOption = (employee: any): SelectOption => ({
  value: String(employee?._id ?? employee?.id ?? employee?.employee_id ?? ""),
  label: String(
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

const complaintTypeOption = (type: any): SelectOption => ({
  value: String(type?._id ?? type?.id ?? type?.complaint_type ?? type?.name ?? ""),
  label: String(
    type?.complaint_type ??
      type?.name ??
      type?.type_name ??
      type?.title ??
      type?._id ??
      type?.id ??
      "",
  ),
});

const complaintTypeRefValue = (ref: any) => String(typeof ref === "object" ? ref?._id ?? ref?.id ?? "" : ref ?? "");

const complaintTypeRefLabel = (ref: any, fallback: any = "") =>
  String(
    typeof ref === "object"
      ? ref?.complaint_type ?? ref?.name ?? ref?.type_name ?? ref?.title ?? ref?._id ?? ref?.id ?? ""
      : fallback || ref || "",
  );

function mapFromApi(p: any): Complaint {
  const employeeRef = p.employee_id;
  const againstRef = p.against_employee_id;
  const ctRef = p.complaint_type_id;
  return {
    id: String(p.id ?? p._id ?? ""),
    employeeId: employeeRefValue(employeeRef),
    employee: employeeRefLabel(employeeRef, p.employee),
    againstEmployeeId: employeeRefValue(againstRef),
    againstEmployee: employeeRefLabel(againstRef, p.againstEmployee ?? p.against_employee),
    complaintTypeId: complaintTypeRefValue(ctRef),
    complaintType: complaintTypeRefLabel(ctRef, p.complaintType ?? p.complaint_type),
    subject: p.subject ?? "",
    description: p.description ?? "",
    complaintDate: (p.complaint_date ?? p.complaintDate ?? "").slice(0, 10),
    document: p.document ?? "",
    status: p.status ?? "Pending",
    resolvedBy: p.resolved_by ?? p.resolvedBy ?? "",
    resolvedAt: (p.resolved_at ?? p.resolvedAt ?? "").slice(0, 10),
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
  | "employee"
  | "againstEmployee"
  | "complaintType"
  | "subject"
  | "status"
  | "complaintDate";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const Complaints: React.FC = () => {
  const navigate = useNavigate();

  const { items: raw, create, update, remove, refetch } = useResourceData(
    complaintHooks,
    { seed: sampleComplaintsSeed as any[], params: { page: 1, limit: 100 } },
  );
  const items = useMemo(() => raw.map(mapFromApi), [raw]);

  // Load options from API
  const empListResult = employeeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const empOptions: SelectOption[] = useMemo(() => {
    const data = empListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map(employeeOption).filter((option) => option.value && option.label);
  }, [empListResult.data]);

  const ctListResult = complaintTypeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const ctOptions: SelectOption[] = useMemo(() => {
    const data = ctListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map(complaintTypeOption).filter((option) => option.value && option.label);
  }, [ctListResult.data]);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("complaintDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [complaintFormData, setComplaintFormData] = useState({
    employee: "",
    againstEmployee: "",
    complaintType: "",
    subject: "",
    description: "",
    complaintDate: "",
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

  const filteredComplaints = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.employee.toLowerCase().includes(q) ||
          c.againstEmployee.toLowerCase().includes(q) ||
          c.complaintType.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((c) => c.status === statusFilter);
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
  }, [items, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredComplaints.length / perPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setComplaintFormData({
        ...complaintFormData,
        document: e.target.files[0],
        documentName: e.target.files[0].name,
      });
    }
  };

  const resetComplaintForm = () => {
    setComplaintFormData({
      employee: "",
      againstEmployee: "",
      complaintType: "",
      subject: "",
      description: "",
      complaintDate: "",
      document: null,
      documentName: "",
    });
  };

  const openCreateModal = () => {
    resetComplaintForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setComplaintFormData({
      employee: complaint.employeeId || complaint.employee,
      againstEmployee: complaint.againstEmployeeId || complaint.againstEmployee,
      complaintType: complaint.complaintTypeId || complaint.complaintType,
      subject: complaint.subject,
      description: complaint.description,
      complaintDate: complaint.complaintDate,
      document: null,
      documentName: complaint.document,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowViewModal(true);
  };

  const openDeleteModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDeleteModal(true);
  };

  const handleStatusUpdate = async (id: string, newStatus: "Resolved" | "Closed") => {
    try {
      await hrmStatusActions.complaint(id, newStatus);
      await refetch();
      showToast(`Complaint ${newStatus.toLowerCase()} successfully!`, "success");
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleSaveComplaint = async () => {
    if (!complaintFormData.employee) {
      showToast("Please select an employee", "info");
      return;
    }
    if (!complaintFormData.againstEmployee) {
      showToast("Please select against employee", "info");
      return;
    }
    if (!complaintFormData.complaintType) {
      showToast("Please select complaint type", "info");
      return;
    }
    if (!complaintFormData.subject) {
      showToast("Please enter subject", "info");
      return;
    }
    if (!complaintFormData.complaintDate) {
      showToast("Please select complaint date", "info");
      return;
    }

    const toApi: Record<string, any> = {
      employee_id: complaintFormData.employee,
      against_employee_id: complaintFormData.againstEmployee,
      complaint_type_id: complaintFormData.complaintType,
      subject: complaintFormData.subject,
      description: complaintFormData.description,
      complaint_date: complaintFormData.complaintDate,
    };
    if (complaintFormData.document) {
      toApi.document = complaintFormData.document;
    }

    try {
      if (isEditing && selectedComplaint) {
        await update(selectedComplaint.id, toApi);
        showToast("Complaint updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(toApi);
        showToast("Complaint created successfully!", "success");
        setShowCreateModal(false);
      }
      resetComplaintForm();
    } catch {
      showToast("Failed to save complaint", "error");
    }
  };

  const handleDeleteComplaint = async () => {
    if (selectedComplaint) {
      try {
        await remove(selectedComplaint.id);
        showToast("Complaint deleted successfully!", "success");
        setShowDeleteModal(false);
        setSelectedComplaint(null);
      } catch {
        showToast("Failed to delete complaint", "error");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-green-100 text-green-700";
      case "In progress":
        return "bg-yellow-100 text-yellow-700";
      case "Assigned":
        return "bg-blue-100 text-blue-700";
      case "Closed":
        return "bg-gray-100 text-gray-700";
      case "Pending":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Resolved":
        return <CheckCircle className="w-3 h-3" />;
      case "In progress":
        return <Clock className="w-3 h-3" />;
      case "Assigned":
        return <Flag className="w-3 h-3" />;
      case "Closed":
        return <X className="w-3 h-3" />;
      case "Pending":
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

  // ─── Fallback option arrays ───────────────────────────────────────────────

  const displayEmpOptions =
    empOptions.length > 0
      ? empOptions
      : [
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
        ].map((name) => ({ value: name, label: name }));
  const displayCtOptions =
    ctOptions.length > 0
      ? ctOptions
      : [
          "General Administrative Issues",
          "Legal & Regulatory Compliance",
          "Diversity & Inclusion Concerns",
          "Remote Work & Flexibility Issues",
          "Security & Access Control",
          "Environmental & Sustainability Issues",
          "Financial & Budget Concerns",
          "Customer Service & Relations",
          "Quality & Process Improvement",
          "Workplace Harassment",
          "Discrimination",
          "Payroll Issues",
        ].map((name) => ({ value: name, label: name }));

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
              {isEditing ? "Edit Complaint" : "Create Complaint"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update complaint information"
                : "Add a new complaint"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetComplaintForm();
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
              value={complaintFormData.employee}
              onChange={(e) =>
                setComplaintFormData({
                  ...complaintFormData,
                  employee: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Employee</option>
              {displayEmpOptions.map((emp) => (
                <option key={emp.value} value={emp.value}>
                  {emp.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Against Employee *
            </label>
            <select
              value={complaintFormData.againstEmployee}
              onChange={(e) =>
                setComplaintFormData({
                  ...complaintFormData,
                  againstEmployee: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Against Employee</option>
              {displayEmpOptions.map((emp) => (
                <option key={emp.value} value={emp.value}>
                  {emp.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complaint Type *
            </label>
            <select
              value={complaintFormData.complaintType}
              onChange={(e) =>
                setComplaintFormData({
                  ...complaintFormData,
                  complaintType: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Complaint Type</option>
              {displayCtOptions.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <select
              value={complaintFormData.subject}
              onChange={(e) =>
                setComplaintFormData({
                  ...complaintFormData,
                  subject: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={complaintFormData.description}
              onChange={(e) =>
                setComplaintFormData({
                  ...complaintFormData,
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
              Complaint Date *
            </label>
            <input
              type="date"
              value={complaintFormData.complaintDate}
              onChange={(e) =>
                setComplaintFormData({
                  ...complaintFormData,
                  complaintDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              {complaintFormData.documentName && (
                <span className="text-sm text-green-600">
                  {complaintFormData.documentName}
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
              resetComplaintForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveComplaint}
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
              Complaint Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedComplaint?.employee}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedComplaint && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedComplaint.employee}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedComplaint.status)}`}
              >
                {getStatusIcon(selectedComplaint.status)}
                {selectedComplaint.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Against Employee</p>
                <p className="text-sm text-gray-600">
                  {selectedComplaint.againstEmployee}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Complaint Type</p>
                <p className="text-sm text-gray-600">
                  {selectedComplaint.complaintType}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Subject</p>
                <p className="text-sm text-gray-600">
                  {selectedComplaint.subject}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Complaint Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedComplaint.complaintDate)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">
                  {selectedComplaint.description}
                </p>
              </div>
            </div>
            {selectedComplaint.resolvedBy && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Resolved By</p>
                  <p className="text-sm text-gray-600">
                    {selectedComplaint.resolvedBy}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Resolved At</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedComplaint.resolvedAt)}
                  </p>
                </div>
              </div>
            )}
            {selectedComplaint.document && (
              <div>
                <p className="text-xs text-gray-500">Document</p>
                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                  <FileText className="w-4 h-4" />
                  {selectedComplaint.document}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between gap-3">
          <div className="flex gap-2">
            {selectedComplaint?.status !== "Resolved" &&
              selectedComplaint?.status !== "Closed" && (
                <>
                  <button
                    onClick={() => {
                      if (selectedComplaint)
                        handleStatusUpdate(selectedComplaint.id, "Resolved");
                      setShowViewModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Resolve
                  </button>
                  <button
                    onClick={() => {
                      if (selectedComplaint)
                        handleStatusUpdate(selectedComplaint.id, "Closed");
                      setShowViewModal(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 inline mr-1" />
                    Close
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
                if (selectedComplaint) openEditModal(selectedComplaint);
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

  // Complete Delete Modal
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
            Delete Complaint
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete this complaint for{" "}
            <span className="font-semibold">{selectedComplaint?.employee}</span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteComplaint}
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
          <span className="text-gray-900 font-medium">Complaints</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Complaints
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
                placeholder="Search Complaints..."
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
                  {["All", "In progress", "Resolved", "Assigned", "Closed"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setCurrentPage(1);
                          setShowFilters(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                      >
                        {status}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="employee" label="Employee Name" />
                <SortHeader field="againstEmployee" label="Against Employee" />
                <SortHeader field="complaintType" label="Complaint Type" />
                <SortHeader field="subject" label="Subject" />
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Document
                </th>
                <SortHeader field="complaintDate" label="Date" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedComplaints.map((complaint) => (
                <tr
                  key={complaint.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(complaint)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {complaint.employee}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {complaint.againstEmployee}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {complaint.complaintType}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {complaint.subject}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}
                    >
                      {getStatusIcon(complaint.status)}
                      {complaint.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {complaint.document ? (
                      <FileText className="w-4 h-4 text-blue-500" />
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(complaint.complaintDate)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(complaint)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(complaint)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(complaint)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedComplaints.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No complaints found.
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
            {filteredComplaints.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredComplaints.length)} of{" "}
            {filteredComplaints.length} results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
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
