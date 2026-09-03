/**
 * File: src/pages/hrm/EmployeeTransfers.tsx
 * Complete Employee Transfers Management page with list view, create/edit modal, and details modal
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
  User,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  Building2,
} from "lucide-react";
import { useResourceData } from "@/hooks/useResourceData";
import {
  employeeTransferHooks,
  employeeHooks,
  branchHooks,
  departmentHooks,
  designationHooks,
  hrmStatusActions,
} from "@/services/hrm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeTransfer {
  id: string;
  employeeId: string;
  employee: string;
  fromBranch: string;
  fromDepartment: string;
  fromDesignation: string;
  toBranch: string;
  toDepartment: string;
  toDesignation: string;
  effectiveDate: string;
  reason: string;
  document: string;
  status: "Pending" | "Approved" | "In progress" | "Cancelled" | "Completed";
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
}

// ─── Sample Data (API-shaped seed) ───────────────────────────────────────────

const sampleTransfersSeed = [
  {
    id: "1",
    employee_id: "Mark Allen",
    to_branch_id: "North Branch",
    to_department_id: "Procurement",
    to_designation_id: "Senior Analyst",
    effective_date: "2026-01-24",
    reason: "Emergency response planning requiring experienced personnel to establish crisis management protocols.",
    status: "In progress",
  },
  {
    id: "2",
    employee_id: "Anthony Walker",
    to_branch_id: "Sales Office",
    to_department_id: "Sales",
    to_designation_id: "Sales Executive",
    effective_date: "2026-01-19",
    reason: "Cross-functional skill development and career growth opportunity.",
    status: "Pending",
  },
  {
    id: "3",
    employee_id: "Matthew Clark",
    to_branch_id: "Regional Office",
    to_department_id: "IT",
    to_designation_id: "System Administrator",
    effective_date: "2026-01-10",
    reason: "Technical expertise needed for infrastructure upgrade project.",
    status: "Approved",
  },
  {
    id: "4",
    employee_id: "Daniel Thompson",
    to_branch_id: "Main Office",
    to_department_id: "Sales & Marketing",
    to_designation_id: "Manager",
    effective_date: "2026-01-09",
    reason: "Leadership expansion and team restructuring.",
    status: "In progress",
  },
  {
    id: "5",
    employee_id: "Christopher Lee",
    to_branch_id: "Corporate Headquarters",
    to_department_id: "Brand Management",
    to_designation_id: "Brand Manager",
    effective_date: "2025-12-31",
    reason: "Corporate branding initiative requiring experienced personnel.",
    status: "In progress",
  },
  {
    id: "6",
    employee_id: "James Garcia",
    to_branch_id: "Customer Service Center",
    to_department_id: "Technical Support",
    to_designation_id: "Team Lead",
    effective_date: "2025-12-25",
    reason: "Technical support team expansion and skill enhancement.",
    status: "Approved",
  },
  {
    id: "7",
    employee_id: "Robert Taylor",
    to_branch_id: "Customer Service Center",
    to_department_id: "Operations",
    to_designation_id: "Operations Analyst",
    effective_date: "2025-12-30",
    reason: "Process improvement initiative and operational excellence.",
    status: "In progress",
  },
  {
    id: "8",
    employee_id: "David Wilson",
    to_branch_id: "East Branch",
    to_department_id: "Administration",
    to_designation_id: "Admin Manager",
    effective_date: "2025-12-23",
    reason: "Branch administration strengthening requirement.",
    status: "Cancelled",
  },
  {
    id: "9",
    employee_id: "Michael Brown",
    to_branch_id: "North Branch",
    to_department_id: "Procurement",
    to_designation_id: "Manager",
    effective_date: "2025-12-13",
    reason: "Procurement department restructuring and leadership gap.",
    status: "In progress",
  },
];

const statuses = [
  "Pending",
  "Approved",
  "In progress",
  "Cancelled",
  "Completed",
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

function mapFromApi(p: any): EmployeeTransfer {
  const empRef = p.employee_id;
  const toBranchRef = p.to_branch_id;
  const toDeptRef = p.to_department_id;
  const toDesigRef = p.to_designation_id;
  const fromBranchRef = p.from_branch_id ?? p.fromBranch;
  const fromDeptRef = p.from_department_id ?? p.fromDepartment;
  const fromDesigRef = p.from_designation_id ?? p.fromDesignation;
  return {
    id: String(p.id ?? p._id ?? ""),
    employeeId: employeeRefValue(empRef),
    employee: employeeRefLabel(empRef, p.employee),
    fromBranch:
      typeof fromBranchRef === "object"
        ? fromBranchRef?.branch_name ?? String(fromBranchRef?._id ?? "")
        : String(fromBranchRef ?? ""),
    fromDepartment:
      typeof fromDeptRef === "object"
        ? fromDeptRef?.department_name ?? String(fromDeptRef?._id ?? "")
        : String(fromDeptRef ?? ""),
    fromDesignation:
      typeof fromDesigRef === "object"
        ? fromDesigRef?.designation_name ?? String(fromDesigRef?._id ?? "")
        : String(fromDesigRef ?? ""),
    toBranch:
      typeof toBranchRef === "object"
        ? toBranchRef?.branch_name ?? String(toBranchRef?._id ?? "")
        : String(toBranchRef ?? p.toBranch ?? ""),
    toDepartment:
      typeof toDeptRef === "object"
        ? toDeptRef?.department_name ?? String(toDeptRef?._id ?? "")
        : String(toDeptRef ?? p.toDepartment ?? ""),
    toDesignation:
      typeof toDesigRef === "object"
        ? toDesigRef?.designation_name ?? String(toDesigRef?._id ?? "")
        : String(toDesigRef ?? p.toDesignation ?? ""),
    effectiveDate: (p.effective_date ?? p.effectiveDate ?? "").slice(0, 10),
    reason: p.reason ?? "",
    document: p.document ?? "",
    status: p.status ?? "Pending",
    approvedBy: refLabel(p.approved_by ?? p.approvedBy),
    approvedAt: (p.approved_at ?? p.approvedAt ?? "").slice(0, 10),
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
  | "transferPath"
  | "status"
  | "effectiveDate"
  | "approvedBy";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const EmployeeTransfers: React.FC = () => {
  const navigate = useNavigate();

  const { items: raw, create, update, remove, refetch } = useResourceData(
    employeeTransferHooks,
    { seed: sampleTransfersSeed as any[], params: { page: 1, limit: 100 } },
  );
  const transfers = useMemo(() => raw.map(mapFromApi), [raw]);

  // Load options from API
  const empListResult = employeeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const empOptions: SelectOption[] = useMemo(() => {
    const data = empListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map(employeeOption).filter((option) => option.value && option.label);
  }, [empListResult.data]);

  const branchListResult = branchHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const branchOptions: string[] = useMemo(() => {
    const data = branchListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map((e: any) => e.branch_name ?? e.name ?? String(e._id ?? e.id ?? ""));
  }, [branchListResult.data]);

  const deptListResult = departmentHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const deptOptions: string[] = useMemo(() => {
    const data = deptListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map((e: any) => e.department_name ?? e.name ?? String(e._id ?? e.id ?? ""));
  }, [deptListResult.data]);

  const desigListResult = designationHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const desigOptions: string[] = useMemo(() => {
    const data = desigListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map((e: any) => e.designation_name ?? e.name ?? String(e._id ?? e.id ?? ""));
  }, [desigListResult.data]);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("effectiveDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] =
    useState<EmployeeTransfer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  // Form state
  const [transferFormData, setTransferFormData] = useState({
    employee: "",
    toBranch: "",
    toDepartment: "",
    toDesignation: "",
    effectiveDate: "",
    reason: "",
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

  const filteredTransfers = useMemo(() => {
    let result = [...transfers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.employee.toLowerCase().includes(q) ||
          t.reason.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((t) => t.status === statusFilter);
    }

    result.sort((a, b) => {
      let aVal = (a as any)[sortField];
      let bVal = (b as any)[sortField];

      if (sortField === "transferPath") {
        aVal = `${a.fromBranch} to ${a.toBranch}`;
        bVal = `${b.fromBranch} to ${b.toBranch}`;
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [transfers, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredTransfers.length / perPage);
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTransferFormData({
        ...transferFormData,
        document: e.target.files[0],
        documentName: e.target.files[0].name,
      });
    }
  };

  const resetTransferForm = () => {
    setTransferFormData({
      employee: "",
      toBranch: "",
      toDepartment: "",
      toDesignation: "",
      effectiveDate: "",
      reason: "",
      document: null,
      documentName: "",
    });
  };

  const openCreateModal = () => {
    resetTransferForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (transfer: EmployeeTransfer) => {
    setSelectedTransfer(transfer);
    setTransferFormData({
      employee: transfer.employeeId || transfer.employee,
      toBranch: transfer.toBranch,
      toDepartment: transfer.toDepartment,
      toDesignation: transfer.toDesignation,
      effectiveDate: transfer.effectiveDate,
      reason: transfer.reason,
      document: null,
      documentName: transfer.document,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (transfer: EmployeeTransfer) => {
    setSelectedTransfer(transfer);
    setShowViewModal(true);
  };

  const openStatusModal = (transfer: EmployeeTransfer) => {
    setSelectedTransfer(transfer);
    setNewStatus(transfer.status);
    setShowStatusModal(true);
  };

  const openDeleteModal = (transfer: EmployeeTransfer) => {
    setSelectedTransfer(transfer);
    setShowDeleteModal(true);
  };

  const handleStatusUpdate = async () => {
    if (selectedTransfer && newStatus) {
      try {
        await hrmStatusActions.employeeTransfer(selectedTransfer.id, newStatus);
        await refetch();
        showToast(`Transfer status updated to ${newStatus}!`, "success");
        setShowStatusModal(false);
      } catch {
        showToast("Failed to update status", "error");
      }
    }
  };

  const handleSaveTransfer = async () => {
    if (!transferFormData.employee) {
      showToast("Please select an employee", "info");
      return;
    }
    if (!transferFormData.toBranch) {
      showToast("Please select to branch", "info");
      return;
    }
    if (!transferFormData.toDepartment) {
      showToast("Please select to department", "info");
      return;
    }
    if (!transferFormData.toDesignation) {
      showToast("Please select to designation", "info");
      return;
    }
    if (!transferFormData.effectiveDate) {
      showToast("Please select effective date", "info");
      return;
    }

    const toApi: Record<string, any> = {
      employee_id: transferFormData.employee,
      to_branch_id: transferFormData.toBranch,
      to_department_id: transferFormData.toDepartment,
      to_designation_id: transferFormData.toDesignation,
      effective_date: transferFormData.effectiveDate,
      reason: transferFormData.reason,
    };
    if (transferFormData.document) {
      toApi.document = transferFormData.document;
    }

    try {
      if (isEditing && selectedTransfer) {
        await update(selectedTransfer.id, toApi);
        showToast("Transfer updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(toApi);
        showToast("Transfer created successfully!", "success");
        setShowCreateModal(false);
      }
      resetTransferForm();
    } catch {
      showToast("Failed to save transfer", "error");
    }
  };

  const handleDeleteTransfer = async () => {
    if (selectedTransfer) {
      try {
        await remove(selectedTransfer.id);
        showToast("Transfer deleted successfully!", "success");
        setShowDeleteModal(false);
        setSelectedTransfer(null);
      } catch {
        showToast("Failed to delete transfer", "error");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-700";
      case "Completed":
        return "bg-blue-100 text-blue-700";
      case "In progress":
        return "bg-yellow-100 text-yellow-700";
      case "Pending":
        return "bg-orange-100 text-orange-700";
      case "Cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="w-3 h-3" />;
      case "Completed":
        return <CheckCircle className="w-3 h-3" />;
      case "In progress":
        return <Clock className="w-3 h-3" />;
      case "Pending":
        return <AlertCircle className="w-3 h-3" />;
      case "Cancelled":
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
  const displayBranchOptions = branchOptions.length > 0 ? branchOptions : [
    "Customer Service Center", "Sales Office", "Regional Office", "Main Office",
    "North Branch", "South Branch", "East Branch", "West Branch", "Corporate Headquarters",
  ];
  const displayDeptOptions = deptOptions.length > 0 ? deptOptions : [
    "Customer Support", "Technical Support", "Legal & Compliance", "Operations",
    "Sales", "Marketing", "Customer Service", "Finance & Accounting",
    "Human Resources", "IT", "Administration", "Procurement",
  ];
  const displayDesigOptions = desigOptions.length > 0 ? desigOptions : [
    "Associate", "Senior Associate", "Team Lead", "Manager", "Analyst",
    "Senior Analyst", "Director", "Coordinator", "Specialist",
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  const CreateEditModal = () => {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing
                  ? "Edit Employee Transfer"
                  : "Create Employee Transfer"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditing
                  ? "Update transfer information"
                  : "Add a new employee transfer"}
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetTransferForm();
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
                value={transferFormData.employee}
                onChange={(e) =>
                  setTransferFormData({
                    ...transferFormData,
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
                To Branch *
              </label>
              <select
                value={transferFormData.toBranch}
                onChange={(e) =>
                  setTransferFormData({
                    ...transferFormData,
                    toBranch: e.target.value,
                    toDepartment: "",
                    toDesignation: "",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">Select To Branch</option>
                {displayBranchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Department *
              </label>
              <select
                value={transferFormData.toDepartment}
                onChange={(e) =>
                  setTransferFormData({
                    ...transferFormData,
                    toDepartment: e.target.value,
                    toDesignation: "",
                  })
                }
                disabled={!transferFormData.toBranch}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100"
              >
                <option value="">
                  {transferFormData.toBranch
                    ? "Select To Department"
                    : "Select Branch first"}
                </option>
                {displayDeptOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Designation *
              </label>
              <select
                value={transferFormData.toDesignation}
                onChange={(e) =>
                  setTransferFormData({
                    ...transferFormData,
                    toDesignation: e.target.value,
                  })
                }
                disabled={!transferFormData.toDepartment}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100"
              >
                <option value="">
                  {transferFormData.toDepartment
                    ? "Select To Designation"
                    : "Select Department first"}
                </option>
                {displayDesigOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Date *
              </label>
              <input
                type="date"
                value={transferFormData.effectiveDate}
                onChange={(e) =>
                  setTransferFormData({
                    ...transferFormData,
                    effectiveDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <textarea
                value={transferFormData.reason}
                onChange={(e) =>
                  setTransferFormData({
                    ...transferFormData,
                    reason: e.target.value,
                  })
                }
                rows={3}
                placeholder="Enter Reason"
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
                {transferFormData.documentName && (
                  <span className="text-sm text-green-600">
                    {transferFormData.documentName}
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
                resetTransferForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTransfer}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isEditing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const StatusModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Update Transfer Status
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedTransfer?.employee}
            </p>
          </div>
          <button
            onClick={() => setShowStatusModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
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
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={() => setShowStatusModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStatusUpdate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update Status
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
              Transfer Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedTransfer?.employee}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedTransfer && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedTransfer.employee}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTransfer.status)}`}
              >
                {getStatusIcon(selectedTransfer.status)}
                {selectedTransfer.status}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Transfer Path</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">
                  {selectedTransfer.fromBranch}
                </span>
                <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-blue-600">
                  {selectedTransfer.toBranch}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                From: {selectedTransfer.fromDepartment} -{" "}
                {selectedTransfer.fromDesignation}
                <br />
                To: {selectedTransfer.toDepartment} -{" "}
                {selectedTransfer.toDesignation}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Effective Date</p>
              <p className="text-sm text-gray-600">
                {formatDate(selectedTransfer.effectiveDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Reason</p>
              <p className="text-sm text-gray-600">{selectedTransfer.reason}</p>
            </div>
            {selectedTransfer.approvedBy && (
              <div>
                <p className="text-xs text-gray-500">Approved By</p>
                <p className="text-sm text-gray-600">
                  {selectedTransfer.approvedBy}
                </p>
              </div>
            )}
            {selectedTransfer.document && (
              <div>
                <p className="text-xs text-gray-500">Document</p>
                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                  <FileText className="w-4 h-4" />
                  {selectedTransfer.document}
                </button>
              </div>
            )}
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
              if (selectedTransfer) openEditModal(selectedTransfer);
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
            Delete Transfer
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete this transfer for{" "}
            <span className="font-semibold">{selectedTransfer?.employee}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteTransfer}
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
            onClick={() => navigate("/hrm")}
            className="hover:text-gray-700"
          >
            HRM
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Employee Transfers</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Employee Transfers
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
                placeholder="Search by employee name or reason..."
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
                      setStatusFilter("In progress");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    In progress
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="employee" label="Employee Name" />
                <SortHeader field="transferPath" label="Transfer Path" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="effectiveDate" label="Effective Date" />
                <SortHeader field="approvedBy" label="Approved By" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedTransfers.map((transfer) => (
                <tr
                  key={transfer.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(transfer)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {transfer.employee}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {transfer.fromBranch} → {transfer.toBranch}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}
                    >
                      {getStatusIcon(transfer.status)}
                      {transfer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(transfer.effectiveDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {transfer.approvedBy || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {transfer.document ? (
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
                        onClick={() => openViewModal(transfer)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(transfer)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openStatusModal(transfer)}
                        className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50"
                        title="Update Status"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(transfer)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedTransfers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No transfers found.
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
            {filteredTransfers.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredTransfers.length)} of{" "}
            {filteredTransfers.length} results
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

      {/* Modals */}
      {(showCreateModal || showEditModal) && CreateEditModal()}
      {showStatusModal && StatusModal()}
      {showViewModal && ViewModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};
