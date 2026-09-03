/**
 * File: src/pages/hrm/Acknowledgments.tsx
 * Complete Acknowledgments Management page with list view, create/edit modal, and details modal
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
  CheckCircle,
  Clock,
} from "lucide-react";
import { useResourceData } from "@/hooks/useResourceData";
import {
  acknowledgmentHooks,
  employeeHooks,
  documentHooks,
  hrmStatusActions,
} from "@/services/hrm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Acknowledgment {
  id: string;
  employeeId: string;
  employee: string;
  document: string;
  status: "Acknowledged" | "Pending";
  acknowledgedAt: string;
  assignedBy: string;
  acknowledgmentNote: string;
  createdAt: string;
}

// ─── Sample Data (API-shaped seed) ───────────────────────────────────────────

const sampleAcknowledgmentsSeed = [
  {
    id: "1",
    employee_id: "Mark Allen",
    document_id: "Business Continuity Plan",
    acknowledgment_note:
      "Business continuity plan is thorough and provides comprehensive disaster recovery procedures for operational resilience.",
    status: "Acknowledged",
  },
  {
    id: "2",
    employee_id: "Anthony Walker",
    document_id: "Customer Service Standards",
    acknowledgment_note: "Customer service standards are clear and actionable.",
    status: "Acknowledged",
  },
  {
    id: "3",
    employee_id: "Matthew Clark",
    document_id: "Environmental Sustainability Plan",
    acknowledgment_note: "",
    status: "Pending",
  },
  {
    id: "4",
    employee_id: "Daniel Thompson",
    document_id: "Innovation Initiative Guidelines",
    acknowledgment_note:
      "Innovation guidelines provide clear framework for project submissions.",
    status: "Acknowledged",
  },
  {
    id: "5",
    employee_id: "Christopher Lee",
    document_id: "Vendor Management Policy",
    acknowledgment_note: "",
    status: "Pending",
  },
  {
    id: "6",
    employee_id: "James Garcia",
    document_id: "Retirement Plan Guide",
    acknowledgment_note: "Retirement plan options are well explained.",
    status: "Acknowledged",
  },
  {
    id: "7",
    employee_id: "Robert Taylor",
    document_id: "Flexible Work Schedule",
    acknowledgment_note:
      "Flexible work schedule policy accommodates work-life balance.",
    status: "Acknowledged",
  },
  {
    id: "8",
    employee_id: "David Wilson",
    document_id: "Data Protection Guidelines",
    acknowledgment_note:
      "Data protection guidelines are comprehensive and up to date.",
    status: "Acknowledged",
  },
  {
    id: "9",
    employee_id: "Michael Brown",
    document_id: "Professional Development Fund",
    acknowledgment_note: "",
    status: "Pending",
  },
];

const statuses = ["Acknowledged", "Pending"];

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

function mapFromApi(p: any): Acknowledgment {
  const empRef = p.employee_id;
  const docRef = p.document_id;
  return {
    id: String(p.id ?? p._id ?? ""),
    employeeId: employeeRefValue(empRef),
    employee: employeeRefLabel(empRef, p.employee),
    document:
      typeof docRef === "object"
        ? docRef?.title ?? docRef?.name ?? String(docRef?._id ?? "")
        : String(docRef ?? p.document ?? ""),
    status: p.status ?? "Pending",
    acknowledgedAt: (p.acknowledged_at ?? p.acknowledgedAt ?? "").slice(0, 10),
    assignedBy: refLabel(p.assigned_by ?? p.assignedBy),
    acknowledgmentNote: p.acknowledgment_note ?? p.acknowledgmentNote ?? "",
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
  | "document"
  | "status"
  | "acknowledgedAt"
  | "assignedBy";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const Acknowledgments: React.FC = () => {
  const navigate = useNavigate();

  const { items: raw, create, update, remove, refetch } = useResourceData(
    acknowledgmentHooks,
    { seed: sampleAcknowledgmentsSeed as any[], params: { page: 1, limit: 100 } },
  );
  const acknowledgments = useMemo(() => raw.map(mapFromApi), [raw]);

  // Load options from API
  const empListResult = employeeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const empOptions: SelectOption[] = useMemo(() => {
    const data = empListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map(employeeOption).filter((option) => option.value && option.label);
  }, [empListResult.data]);

  const docListResult = documentHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const docOptions: string[] = useMemo(() => {
    const data = docListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map((e: any) => e.title ?? e.name ?? String(e._id ?? e.id ?? ""));
  }, [docListResult.data]);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("employee");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAcknowledgment, setSelectedAcknowledgment] =
    useState<Acknowledgment | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [acknowledgmentFormData, setAcknowledgmentFormData] = useState({
    employee: "",
    document: "",
    acknowledgmentNote: "",
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

  const filteredAcknowledgments = useMemo(() => {
    let result = [...acknowledgments];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.employee.toLowerCase().includes(q) ||
          a.document.toLowerCase().includes(q) ||
          a.assignedBy.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((a) => a.status === statusFilter);
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
  }, [acknowledgments, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredAcknowledgments.length / perPage);
  const paginatedAcknowledgments = filteredAcknowledgments.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetAcknowledgmentForm = () => {
    setAcknowledgmentFormData({
      employee: "",
      document: "",
      acknowledgmentNote: "",
    });
  };

  const openCreateModal = () => {
    resetAcknowledgmentForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (acknowledgment: Acknowledgment) => {
    setSelectedAcknowledgment(acknowledgment);
    setAcknowledgmentFormData({
      employee: acknowledgment.employeeId || acknowledgment.employee,
      document: acknowledgment.document,
      acknowledgmentNote: acknowledgment.acknowledgmentNote,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (acknowledgment: Acknowledgment) => {
    setSelectedAcknowledgment(acknowledgment);
    setShowViewModal(true);
  };

  const openDeleteModal = (acknowledgment: Acknowledgment) => {
    setSelectedAcknowledgment(acknowledgment);
    setShowDeleteModal(true);
  };

  const handleMarkAsAcknowledged = async (id: string) => {
    try {
      await hrmStatusActions.acknowledgment(id, "Acknowledged");
      await refetch();
      showToast("Marked as acknowledged successfully!", "success");
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleSaveAcknowledgment = async () => {
    if (!acknowledgmentFormData.employee) {
      showToast("Please select an employee", "info");
      return;
    }
    if (!acknowledgmentFormData.document) {
      showToast("Please select a document", "info");
      return;
    }

    const toApi = {
      employee_id: acknowledgmentFormData.employee,
      document_id: acknowledgmentFormData.document,
      acknowledgment_note: acknowledgmentFormData.acknowledgmentNote,
    };

    try {
      if (isEditing && selectedAcknowledgment) {
        await update(selectedAcknowledgment.id, toApi);
        showToast("Acknowledgment updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(toApi);
        showToast("Acknowledgment created successfully!", "success");
        setShowCreateModal(false);
      }
      resetAcknowledgmentForm();
    } catch {
      showToast("Failed to save acknowledgment", "error");
    }
  };

  const handleDeleteAcknowledgment = async () => {
    if (selectedAcknowledgment) {
      try {
        await remove(selectedAcknowledgment.id);
        showToast("Acknowledgment deleted successfully!", "success");
        setShowDeleteModal(false);
        setSelectedAcknowledgment(null);
      } catch {
        showToast("Failed to delete acknowledgment", "error");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Acknowledged":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Acknowledged":
        return <CheckCircle className="w-3 h-3" />;
      case "Pending":
        return <Clock className="w-3 h-3" />;
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
  const displayDocOptions = docOptions.length > 0 ? docOptions : [
    "Business Continuity Plan", "Customer Service Standards",
    "Environmental Sustainability Plan", "Innovation Initiative Guidelines",
    "Vendor Management Policy", "Retirement Plan Guide", "Flexible Work Schedule",
    "Data Protection Guidelines", "Professional Development Fund",
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
              {isEditing ? "Edit Acknowledgment" : "Create Acknowledgment"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update acknowledgment information"
                : "Add a new acknowledgment"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetAcknowledgmentForm();
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
              value={acknowledgmentFormData.employee}
              onChange={(e) =>
                setAcknowledgmentFormData({
                  ...acknowledgmentFormData,
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
              Document *
            </label>
            <select
              value={acknowledgmentFormData.document}
              onChange={(e) =>
                setAcknowledgmentFormData({
                  ...acknowledgmentFormData,
                  document: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Document</option>
              {displayDocOptions.map((doc) => (
                <option key={doc} value={doc}>
                  {doc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acknowledgment Note
            </label>
            <textarea
              value={acknowledgmentFormData.acknowledgmentNote}
              onChange={(e) =>
                setAcknowledgmentFormData({
                  ...acknowledgmentFormData,
                  acknowledgmentNote: e.target.value,
                })
              }
              rows={3}
              placeholder="Enter Acknowledgment Note"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetAcknowledgmentForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAcknowledgment}
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
              Acknowledgement Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedAcknowledgment?.employee}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedAcknowledgment && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedAcknowledgment.employee}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAcknowledgment.status)}`}
              >
                {getStatusIcon(selectedAcknowledgment.status)}
                {selectedAcknowledgment.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Document</p>
                <p className="text-sm text-gray-600">
                  {selectedAcknowledgment.document}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assigned By</p>
                <p className="text-sm text-gray-600">
                  {selectedAcknowledgment.assignedBy}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Acknowledged At</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedAcknowledgment.acknowledgedAt)}
                </p>
              </div>
            </div>
            {selectedAcknowledgment.acknowledgmentNote && (
              <div>
                <p className="text-xs text-gray-500">Acknowledgment Note</p>
                <p className="text-sm text-gray-600">
                  {selectedAcknowledgment.acknowledgmentNote}
                </p>
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
          {selectedAcknowledgment?.status === "Pending" && (
            <button
              onClick={() => {
                if (selectedAcknowledgment)
                  handleMarkAsAcknowledged(selectedAcknowledgment.id);
                setShowViewModal(false);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Mark as Acknowledged
            </button>
          )}
          <button
            onClick={() => {
              setShowViewModal(false);
              if (selectedAcknowledgment) openEditModal(selectedAcknowledgment);
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
            Delete Acknowledgment
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete this acknowledgment for{" "}
            <span className="font-semibold">
              {selectedAcknowledgment?.employee}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteAcknowledgment}
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
            onClick={() => navigate("/hrm")}
            className="hover:text-gray-700"
          >
            HRM
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Acknowledgments</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Acknowledgments
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
                placeholder="Search by employee, document..."
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
                  {statuses.map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st);
                        setCurrentPage(1);
                        setShowFilters(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      {st}
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
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="employee" label="Employee" />
                <SortHeader field="document" label="Document" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="acknowledgedAt" label="Acknowledged At" />
                <SortHeader field="assignedBy" label="Assigned By" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedAcknowledgments.map((ack) => (
                <tr
                  key={ack.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(ack)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {ack.employee}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{ack.document}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ack.status)}`}
                    >
                      {getStatusIcon(ack.status)}
                      {ack.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(ack.acknowledgedAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ack.assignedBy}</td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(ack)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(ack)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {ack.status === "Pending" ? (
                        <button
                          onClick={() => handleMarkAsAcknowledged(ack.id)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */
                      )}
                      <button
                        onClick={() => openDeleteModal(ack)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedAcknowledgments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No acknowledgments found.
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
            {filteredAcknowledgments.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredAcknowledgments.length)}{" "}
            of {filteredAcknowledgments.length} results
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
