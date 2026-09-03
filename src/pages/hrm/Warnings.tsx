/**
 * File: src/pages/hrm/Warnings.tsx
 * Complete Warnings Management page with list view, create/edit modal, and details modal
 * Based on provided screenshots design
 */

import React, { useState, useMemo } from "react";
import { refLabel } from "@/services/_http";
import { apiLabel } from "./hrmShared";
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
  AlertTriangle,
  Flag,
} from "lucide-react";
import { useResourceData } from "@/hooks/useResourceData";
import {
  warningHooks,
  warningTypeHooks,
  employeeHooks,
  hrmStatusActions,
} from "@/services/hrm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Warning {
  id: string;
  employeeId?: string;
  employee: string;
  warningBy: string;
  warningType: string;
  subject: string;
  severity: "High" | "Medium" | "Low";
  warningDate: string;
  description: string;
  document: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleWarnings: Warning[] = [
  {
    id: "1",
    employee: "Mark Allen",
    warningBy: "Matthew Clark",
    warningType: "Misuse of Company Property",
    subject: "Performance Improvement - Action Plan Needed",
    severity: "High",
    warningDate: "2026-01-12",
    description:
      "Employee was found using company equipment for personal business during working hours.",
    document: "",
    status: "Pending",
    createdAt: "2026-01-12",
  },
  {
    id: "2",
    employee: "Anthony Walker",
    warningBy: "Smart Systems Corp",
    warningType: "Use of Offensive Language",
    subject: "Conflict Resolution - Escalation Required",
    severity: "Medium",
    warningDate: "2026-01-07",
    description:
      "Conflict resolution issues requiring escalation due to inability to resolve workplace disputes professionally.",
    document: "warning.png",
    status: "Pending",
    createdAt: "2026-01-07",
  },
  {
    id: "3",
    employee: "Matthew Clark",
    warningBy: "XYZ Industries",
    warningType: "Disrespect to Supervisor",
    subject: "Reporting Standards - Late Submission",
    severity: "Low",
    warningDate: "2026-01-02",
    description:
      "Repeated failure to submit reports on time and disrespectful behavior towards supervisor.",
    document: "",
    status: "Pending",
    createdAt: "2026-01-02",
  },
  {
    id: "4",
    employee: "Daniel Thompson",
    warningBy: "Mega Distributors",
    warningType: "Negligence at Work",
    subject: "Equipment Care - Damage Due to Negligence",
    severity: "High",
    warningDate: "2025-12-28",
    description:
      "Damaged company equipment due to careless handling and ignoring safety protocols.",
    document: "",
    status: "Approved",
    createdAt: "2025-12-28",
  },
  {
    id: "5",
    employee: "Christopher Lee",
    warningBy: "Elite Enterprises",
    warningType: "Improper Dress Code",
    subject: "Training Compliance - Certification Expired",
    severity: "Medium",
    warningDate: "2025-12-23",
    description:
      "Failed to maintain required professional appearance standards.",
    document: "",
    status: "Pending",
    createdAt: "2025-12-23",
  },
  {
    id: "6",
    employee: "James Garcia",
    warningBy: "Express Suppliers",
    warningType: "Unauthorized Absence",
    subject: "Environmental Compliance - Waste Disposal",
    severity: "Low",
    warningDate: "2025-12-18",
    description: "Left work without prior approval on multiple occasions.",
    document: "",
    status: "Pending",
    createdAt: "2025-12-18",
  },
  {
    id: "7",
    employee: "Robert Taylor",
    warningBy: "Lisa Anderson",
    warningType: "Violation of Company Policy",
    subject: "Quality Control - Standards Not Maintained",
    severity: "High",
    warningDate: "2025-12-13",
    description:
      "Deliberate violation of established company policies and procedures.",
    document: "",
    status: "Pending",
    createdAt: "2025-12-13",
  },
  {
    id: "8",
    employee: "David Wilson",
    warningBy: "Robert Taylor",
    warningType: "Missed Deadline",
    subject: "Inventory Management - Discrepancy Found",
    severity: "Medium",
    warningDate: "2025-12-08",
    description:
      "Failed to meet critical project deadlines affecting team performance.",
    document: "",
    status: "Rejected",
    createdAt: "2025-12-08",
  },
  {
    id: "9",
    employee: "Michael Brown",
    warningBy: "Emily Davis",
    warningType: "Unprofessional Behavior",
    subject: "Data Security - Password Policy Violation",
    severity: "Low",
    warningDate: "2025-12-03",
    description: "Displayed unprofessional conduct during team meetings.",
    document: "",
    status: "Pending",
    createdAt: "2025-12-03",
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

const warningByList = [
  "Matthew Clark",
  "Smart Systems Corp",
  "XYZ Industries",
  "Mega Distributors",
  "Elite Enterprises",
  "Express Suppliers",
  "Lisa Anderson",
  "Robert Taylor",
  "Emily Davis",
  "HR Department",
  "Quality Parts Corp",
];

const warningTypes = [
  "Misuse of Company Property",
  "Use of Offensive Language",
  "Disrespect to Supervisor",
  "Negligence at Work",
  "Improper Dress Code",
  "Unauthorized Absence",
  "Violation of Company Policy",
  "Missed Deadline",
  "Unprofessional Behavior",
  "Late Attendance",
  "Data Security Violation",
];

const subjects = [
  "Performance Improvement - Action Plan Needed",
  "Conflict Resolution - Escalation Required",
  "Reporting Standards - Late Submission",
  "Equipment Care - Damage Due to Negligence",
  "Training Compliance - Certification Expired",
  "Environmental Compliance - Waste Disposal",
  "Quality Control - Standards Not Maintained",
  "Inventory Management - Discrepancy Found",
  "Data Security - Password Policy Violation",
  "Attendance Policy Violation",
  "Code of Conduct Breach",
];

const severities = ["High", "Medium", "Low"];

// ─── Seed (snake_case for API) ────────────────────────────────────────────────

const sampleWarningsSeed = sampleWarnings.map((w) => ({
  id: w.id,
  employee_id: w.employee,
  warning_by: w.warningBy,
  warning_type_id: w.warningType,
  subject: w.subject,
  severity: w.severity.toLowerCase(),
  warning_date: w.warningDate,
  description: w.description,
  status: w.status.toLowerCase(),
}));

// ─── mapFromApi ───────────────────────────────────────────────────────────────

type SelectOption = { id: string; name: string };

const employeeOption = (employee: any): SelectOption => ({
  id: String(employee?._id ?? employee?.id ?? employee?.employee_id ?? ""),
  // apiLabel never returns a raw id — empty names are filtered out by the
  // caller so the local fallback list shows instead of blank/id options.
  name: apiLabel(employee, ["employee_user_id", "user_id", "name", "employee_name", "full_name", "first_name"]),
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

function mapFromApi(p: any): Warning {
  const empField = p.employee_id ?? p.employeeId;
  const wtField = p.warning_type_id ?? p.warningTypeId;
  const sev = (p.severity ?? "medium");
  const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  return {
    id: String(p.id ?? p._id ?? ""),
    employeeId: employeeRefValue(empField),
    employee: employeeRefLabel(empField, p.employee),
    warningBy: refLabel(p.warning_by ?? p.warningBy),
    warningType:
      typeof wtField === "object"
        ? wtField?.name ?? ""
        : String(wtField ?? p.warningType ?? ""),
    subject: p.subject ?? "",
    severity: capFirst(sev) as Warning["severity"],
    warningDate: (p.warning_date ?? p.warningDate ?? "").slice(0, 10),
    description: p.description ?? "",
    document: p.document ?? "",
    status: (() => {
      const s = (p.status ?? "pending").toLowerCase();
      if (s === "approved") return "Approved";
      if (s === "rejected") return "Rejected";
      return "Pending";
    })() as Warning["status"],
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

type SortField =
  | "employee"
  | "warningBy"
  | "warningType"
  | "subject"
  | "severity"
  | "warningDate"
  | "status";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const Warnings: React.FC = () => {
  const navigate = useNavigate();

  const { items: raw, create, update, remove, refetch } = useResourceData(
    warningHooks,
    { seed: sampleWarningsSeed as any, params: { page: 1, limit: 100 } },
  );
  const warnings = useMemo(() => raw.map(mapFromApi), [raw]);

  // Employee options from API
  const empQuery = employeeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const empOptions = useMemo(
    () =>
      (empQuery.data ?? [])
        .map(employeeOption)
        .filter((option) => option.id && option.name),
    [empQuery.data],
  );

  // Warning type options from API — empty labels are dropped so the static
  // fallback list renders instead of invisible options.
  const wtQuery = warningTypeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const wtOptions = useMemo(
    () =>
      (wtQuery.data ?? [])
        .map((t: any) => ({
          id: String(t.id ?? t._id ?? ""),
          name: apiLabel(t, ["name", "type_name", "warning_type", "warningType", "type", "title"]),
        }))
        .filter((o: SelectOption) => o.id && o.name),
    [wtQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("warningDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [warningFormData, setWarningFormData] = useState({
    employee: "",
    warningBy: "",
    warningType: "",
    subject: "",
    severity: "Medium" as "High" | "Medium" | "Low",
    warningDate: "",
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

  const filteredWarnings = useMemo(() => {
    let result = [...warnings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.employee.toLowerCase().includes(q) ||
          w.warningType.toLowerCase().includes(q) ||
          w.subject.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((w) => w.status === statusFilter);
    }

    if (severityFilter !== "All") {
      result = result.filter((w) => w.severity === severityFilter);
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "severity") {
        const severityOrder = { High: 3, Medium: 2, Low: 1 };
        aVal = severityOrder[a.severity];
        bVal = severityOrder[b.severity];
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [warnings, searchQuery, statusFilter, severityFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredWarnings.length / perPage);
  const paginatedWarnings = filteredWarnings.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setWarningFormData({
        ...warningFormData,
        document: e.target.files[0],
        documentName: e.target.files[0].name,
      });
    }
  };

  const resetWarningForm = () => {
    setWarningFormData({
      employee: "",
      warningBy: "",
      warningType: "",
      subject: "",
      severity: "Medium",
      warningDate: "",
      description: "",
      document: null,
      documentName: "",
    });
  };

  const openCreateModal = () => {
    resetWarningForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (warning: Warning) => {
    setSelectedWarning(warning);
    setWarningFormData({
      employee: warning.employeeId || warning.employee,
      warningBy: warning.warningBy,
      warningType: warning.warningType,
      subject: warning.subject,
      severity: warning.severity,
      warningDate: warning.warningDate,
      description: warning.description,
      document: null,
      documentName: warning.document,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (warning: Warning) => {
    setSelectedWarning(warning);
    setShowViewModal(true);
  };

  const openDeleteModal = (warning: Warning) => {
    setSelectedWarning(warning);
    setShowDeleteModal(true);
  };

  const handleStatusUpdate = async (
    id: string,
    newStatus: "Approved" | "Rejected",
  ) => {
    try {
      await hrmStatusActions.warningResponse(id, newStatus.toLowerCase());
      refetch();
      showToast(`Warning ${newStatus.toLowerCase()} successfully!`, "success");
    } catch {
      showToast("Action failed.", "error");
    }
  };

  const handleSaveWarning = async () => {
    if (!warningFormData.employee) {
      showToast("Please select an employee", "info");
      return;
    }
    if (!warningFormData.warningBy) {
      showToast("Please select warning by", "info");
      return;
    }
    if (!warningFormData.warningType) {
      showToast("Please select warning type", "info");
      return;
    }
    if (!warningFormData.subject) {
      showToast("Please enter subject", "info");
      return;
    }
    if (!warningFormData.warningDate) {
      showToast("Please select warning date", "info");
      return;
    }

    const payload = {
      employee_id: warningFormData.employee,
      warning_by: warningFormData.warningBy,
      warning_type_id: warningFormData.warningType,
      subject: warningFormData.subject,
      severity: warningFormData.severity.toLowerCase(),
      warning_date: warningFormData.warningDate,
      description: warningFormData.description,
    };

    try {
      if (isEditing && selectedWarning) {
        await update(selectedWarning.id, payload);
        showToast("Warning updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(payload);
        showToast("Warning created successfully!", "success");
        setShowCreateModal(false);
      }
      resetWarningForm();
    } catch {
      showToast("Operation failed.", "error");
    }
  };

  const handleDeleteWarning = async () => {
    if (selectedWarning) {
      try {
        await remove(selectedWarning.id);
        showToast("Warning deleted successfully!", "success");
        setShowDeleteModal(false);
        setSelectedWarning(null);
      } catch {
        showToast("Delete failed.", "error");
      }
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "High":
        return <AlertTriangle className="w-3 h-3" />;
      case "Medium":
        return <AlertCircle className="w-3 h-3" />;
      case "Low":
        return <Flag className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-yellow-100 text-yellow-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="w-3 h-3" />;
      case "Pending":
        return <Clock className="w-3 h-3" />;
      case "Rejected":
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
              {isEditing ? "Edit Warning" : "Create Warning"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing ? "Update warning information" : "Add a new warning"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetWarningForm();
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
              value={warningFormData.employee}
              onChange={(e) =>
                setWarningFormData({
                  ...warningFormData,
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
              Warning By *
            </label>
            <select
              value={warningFormData.warningBy}
              onChange={(e) =>
                setWarningFormData({
                  ...warningFormData,
                  warningBy: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Warning By</option>
              {warningByList.map((wb) => (
                <option key={wb} value={wb}>
                  {wb}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warning Type *
            </label>
            <select
              value={warningFormData.warningType}
              onChange={(e) =>
                setWarningFormData({
                  ...warningFormData,
                  warningType: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Warning Type</option>
              {wtOptions.length > 0
                ? wtOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))
                : warningTypes.map((wt) => (
                    <option key={wt} value={wt}>
                      {wt}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <select
              value={warningFormData.subject}
              onChange={(e) =>
                setWarningFormData({
                  ...warningFormData,
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
              Severity *
            </label>
            <div className="flex gap-4">
              {severities.map((s) => (
                <label key={s} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="severity"
                    value={s}
                    checked={warningFormData.severity === s}
                    onChange={() =>
                      setWarningFormData({
                        ...warningFormData,
                        severity: s as any,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warning Date *
            </label>
            <input
              type="date"
              value={warningFormData.warningDate}
              onChange={(e) =>
                setWarningFormData({
                  ...warningFormData,
                  warningDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={warningFormData.description}
              onChange={(e) =>
                setWarningFormData({
                  ...warningFormData,
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
              {warningFormData.documentName && (
                <span className="text-sm text-green-600">
                  {warningFormData.documentName}
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
              resetWarningForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveWarning}
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
              Warning Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedWarning?.employee}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedWarning && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedWarning.employee}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedWarning.status)}`}
              >
                {getStatusIcon(selectedWarning.status)}
                {selectedWarning.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Warning By</p>
                <p className="text-sm text-gray-600">
                  {selectedWarning.warningBy}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Warning Type</p>
                <p className="text-sm text-gray-600">
                  {selectedWarning.warningType}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Subject</p>
                <p className="text-sm text-gray-600">
                  {selectedWarning.subject}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Severity</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedWarning.severity)}`}
                >
                  {getSeverityIcon(selectedWarning.severity)}
                  {selectedWarning.severity}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Warning Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedWarning.warningDate)}
                </p>
              </div>
            </div>
            {selectedWarning.description && (
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">
                  {selectedWarning.description}
                </p>
              </div>
            )}
            {selectedWarning.document && (
              <div>
                <p className="text-xs text-gray-500">Document</p>
                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                  <FileText className="w-4 h-4" />
                  {selectedWarning.document}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between gap-3">
          <div className="flex gap-2">
            {selectedWarning?.status === "Pending" && (
              <>
                <button
                  onClick={() => {
                    if (selectedWarning)
                      handleStatusUpdate(selectedWarning.id, "Approved");
                    setShowViewModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    if (selectedWarning)
                      handleStatusUpdate(selectedWarning.id, "Rejected");
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
                if (selectedWarning) openEditModal(selectedWarning);
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
            Delete Warning
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete this warning for{" "}
            <span className="font-semibold">{selectedWarning?.employee}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteWarning}
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
          <span className="text-gray-900 font-medium">Warnings</span>
        </div>
      </div>
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Warnings
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
                placeholder="Search Warnings..."
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
                      setStatusFilter("Approved");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Approved
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
                  <div className="px-3 pb-2 mt-2 mb-1 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500">
                      Severity
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSeverityFilter("All");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setSeverityFilter("High");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    High
                  </button>
                  <button
                    onClick={() => {
                      setSeverityFilter("Medium");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => {
                      setSeverityFilter("Low");
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
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="employee" label="Employee Name" />
                <SortHeader field="warningBy" label="Warning By Name" />
                <SortHeader field="warningType" label="Warning Type" />
                <SortHeader field="subject" label="Subject" />
                <SortHeader field="severity" label="Severity" />
                <SortHeader field="warningDate" label="Warning Date" />
                <SortHeader field="status" label="Warning Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedWarnings.map((warning) => (
                <tr
                  key={warning.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(warning)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {warning.employee}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {warning.warningBy}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {warning.warningType}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {warning.subject}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(warning.severity)}`}
                    >
                      {getSeverityIcon(warning.severity)}
                      {warning.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(warning.warningDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(warning.status)}`}
                    >
                      {getStatusIcon(warning.status)}
                      {warning.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {warning.document ? (
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
                        onClick={() => openViewModal(warning)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(warning)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(warning)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedWarnings.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No warnings found.
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
            {filteredWarnings.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredWarnings.length)} of{" "}
            {filteredWarnings.length} results
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
