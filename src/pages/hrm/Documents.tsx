/**
 * File: src/pages/hrm/Documents.tsx
 * Complete Documents Management page with list view, create/edit modal, and details modal
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
  Clock,
  File,
  Image,
  FileArchive,
} from "lucide-react";
import { useResourceData } from "@/hooks/useResourceData";
import {
  documentHooks,
  documentCategoryHooks,
  hrmStatusActions,
} from "@/services/hrm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  title: string;
  documentCategory: string;
  description: string;
  effectiveDate: string;
  uploadedBy: string;
  approvedBy: string;
  status: "Approved" | "Pending" | "Rejected";
  documentUrl: string;
  fileName: string;
  fileType: string;
  createdAt: string;
}

// ─── Sample Data (API-shaped seed) ───────────────────────────────────────────

const sampleDocumentsSeed = [
  {
    id: "1",
    title: "Business Continuity Plan",
    document_category_id: "Legal Documents",
    description: "Comprehensive business continuity and disaster recovery plan.",
    effective_date: "2026-01-13",
    status: "Approved",
  },
  {
    id: "2",
    title: "Customer Service Standards",
    document_category_id: "Professional Licenses",
    description: "Standards and guidelines for customer service excellence.",
    effective_date: "2026-01-07",
    status: "Approved",
  },
  {
    id: "3",
    title: "Environmental Sustainability Plan",
    document_category_id: "Legal Documents",
    description:
      "Corporate environmental responsibility initiatives including waste reduction, energy conservation, and sustainable business practices.",
    effective_date: "",
    status: "Pending",
  },
  {
    id: "4",
    title: "Innovation Initiative Guidelines",
    document_category_id: "Training Certificates",
    description: "Guidelines for innovation projects and initiatives.",
    effective_date: "2025-12-29",
    status: "Approved",
  },
  {
    id: "5",
    title: "Vendor Management Policy",
    document_category_id: "Contract Documents",
    description: "Policies and procedures for vendor management.",
    effective_date: "",
    status: "Rejected",
  },
  {
    id: "6",
    title: "Retirement Plan Guide",
    document_category_id: "Financial Documents",
    description: "Guide to employee retirement plans and benefits.",
    effective_date: "2025-12-18",
    status: "Approved",
  },
  {
    id: "7",
    title: "Flexible Work Schedule",
    document_category_id: "Employment Records",
    description: "Policy for flexible work arrangements.",
    effective_date: "",
    status: "Pending",
  },
  {
    id: "8",
    title: "Data Protection Guidelines",
    document_category_id: "Professional Licenses",
    description: "Guidelines for data protection and privacy.",
    effective_date: "2025-12-09",
    status: "Approved",
  },
  {
    id: "9",
    title: "Professional Development Fund",
    document_category_id: "Financial Documents",
    description: "Policy for professional development funding.",
    effective_date: "",
    status: "Rejected",
  },
];

const statuses = ["Pending", "Approved", "Rejected"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapFromApi(p: any): Document {
  const dcRef = p.document_category_id;
  return {
    id: String(p.id ?? p._id ?? ""),
    title: p.title ?? "",
    documentCategory:
      typeof dcRef === "object"
        ? dcRef?.name ?? String(dcRef?._id ?? "")
        : String(dcRef ?? p.documentCategory ?? p.document_category ?? ""),
    description: p.description ?? "",
    effectiveDate: (p.effective_date ?? p.effectiveDate ?? "").slice(0, 10),
    uploadedBy: p.uploaded_by ?? p.uploadedBy ?? "",
    approvedBy: refLabel(p.approved_by ?? p.approvedBy),
    status: p.status ?? "Pending",
    documentUrl: p.document_url ?? p.documentUrl ?? "",
    fileName: p.file_name ?? p.fileName ?? "",
    fileType: p.file_type ?? p.fileType ?? "",
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
  | "documentCategory"
  | "effectiveDate"
  | "uploadedBy"
  | "approvedBy"
  | "status";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const Documents: React.FC = () => {
  const navigate = useNavigate();

  const { items: raw, create, update, remove, refetch } = useResourceData(
    documentHooks,
    { seed: sampleDocumentsSeed as any[], params: { page: 1, limit: 100 } },
  );
  const documents = useMemo(() => raw.map(mapFromApi), [raw]);

  // Load options from API
  const dcListResult = documentCategoryHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const dcOptions: string[] = useMemo(() => {
    const data = dcListResult.data as any[] | undefined;
    if (!data) return [];
    return data.map((e: any) => e.name ?? String(e._id ?? e.id ?? ""));
  }, [dcListResult.data]);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [documentFormData, setDocumentFormData] = useState({
    title: "",
    documentCategory: "",
    description: "",
    effectiveDate: "",
    document: null as File | null,
    fileName: "",
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

  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.documentCategory.toLowerCase().includes(q) ||
          d.uploadedBy.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((d) => d.status === statusFilter);
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
  }, [documents, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredDocuments.length / perPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocumentFormData({
        ...documentFormData,
        document: file,
        fileName: file.name,
      });
    }
  };

  const resetDocumentForm = () => {
    setDocumentFormData({
      title: "",
      documentCategory: "",
      description: "",
      effectiveDate: "",
      document: null,
      fileName: "",
    });
  };

  const openCreateModal = () => {
    resetDocumentForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (doc: Document) => {
    setSelectedDocument(doc);
    setDocumentFormData({
      title: doc.title,
      documentCategory: doc.documentCategory,
      description: doc.description,
      effectiveDate: doc.effectiveDate,
      document: null,
      fileName: doc.fileName,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (doc: Document) => {
    setSelectedDocument(doc);
    setShowViewModal(true);
  };

  const openDeleteModal = (doc: Document) => {
    setSelectedDocument(doc);
    setShowDeleteModal(true);
  };

  const handleStatusUpdate = async (
    id: string,
    newStatus: "Approved" | "Rejected",
  ) => {
    try {
      await hrmStatusActions.document(id, newStatus);
      await refetch();
      showToast(`Document ${newStatus.toLowerCase()} successfully!`, "success");
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleSaveDocument = async () => {
    if (!documentFormData.title) {
      showToast("Please enter document title", "info");
      return;
    }
    if (!documentFormData.documentCategory) {
      showToast("Please select document category", "info");
      return;
    }
    if (!documentFormData.description) {
      showToast("Please enter description", "info");
      return;
    }

    const toApi: Record<string, any> = {
      title: documentFormData.title,
      document_category_id: documentFormData.documentCategory,
      description: documentFormData.description,
      effective_date: documentFormData.effectiveDate,
    };
    if (documentFormData.document) {
      toApi.document = documentFormData.document;
    }

    try {
      if (isEditing && selectedDocument) {
        await update(selectedDocument.id, toApi);
        showToast("Document updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(toApi);
        showToast("Document created successfully!", "success");
        setShowCreateModal(false);
      }
      resetDocumentForm();
    } catch {
      showToast("Failed to save document", "error");
    }
  };

  const handleDeleteDocument = async () => {
    if (selectedDocument) {
      try {
        await remove(selectedDocument.id);
        showToast("Document deleted successfully!", "success");
        setShowDeleteModal(false);
        setSelectedDocument(null);
      } catch {
        showToast("Failed to delete document", "error");
      }
    }
  };

  const handleDownloadDocument = (doc: Document) => {
    showToast(`Downloading ${doc.fileName}...`, "info");
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

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
    if (ext === "jpg" || ext === "png" || ext === "jpeg")
      return <Image className="w-4 h-4 text-blue-500" />;
    if (ext === "zip" || ext === "rar")
      return <FileArchive className="w-4 h-4 text-yellow-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
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

  const displayDcOptions = dcOptions.length > 0 ? dcOptions : [
    "Legal Documents", "Professional Licenses", "Training Certificates",
    "Contract Documents", "Financial Documents", "Employment Records",
    "Policy Documents", "Compliance Documents", "HR Documents",
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
              {isEditing ? "Edit Document" : "Create Document"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing ? "Update document information" : "Add a new document"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetDocumentForm();
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
              value={documentFormData.title}
              onChange={(e) =>
                setDocumentFormData({
                  ...documentFormData,
                  title: e.target.value,
                })
              }
              placeholder="Enter Title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Category *
            </label>
            <select
              value={documentFormData.documentCategory}
              onChange={(e) =>
                setDocumentFormData({
                  ...documentFormData,
                  documentCategory: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select Document Category</option>
              {displayDcOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={documentFormData.description}
              onChange={(e) =>
                setDocumentFormData({
                  ...documentFormData,
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
              Effective Date
            </label>
            <input
              type="date"
              value={documentFormData.effectiveDate}
              onChange={(e) =>
                setDocumentFormData({
                  ...documentFormData,
                  effectiveDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document *
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
              {documentFormData.fileName && (
                <span className="text-sm text-green-600">
                  {documentFormData.fileName}
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
              resetDocumentForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDocument}
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
              Document Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedDocument?.title}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedDocument && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Title</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedDocument.title}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDocument.status)}`}
              >
                {getStatusIcon(selectedDocument.status)}
                {selectedDocument.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Document Category</p>
                <p className="text-sm text-gray-600">
                  {selectedDocument.documentCategory}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Effective Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedDocument.effectiveDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Uploaded By</p>
                <p className="text-sm text-gray-600">
                  {selectedDocument.uploadedBy}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Approved By</p>
                <p className="text-sm text-gray-600">
                  {selectedDocument.approvedBy || "-"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">
                  {selectedDocument.description}
                </p>
              </div>
            </div>
            {selectedDocument.fileName && (
              <div>
                <p className="text-xs text-gray-500">Document</p>
                <button
                  onClick={() => handleDownloadDocument(selectedDocument)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  {getFileIcon(selectedDocument.fileName)}
                  {selectedDocument.fileName}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between gap-3">
          <div className="flex gap-2">
            {selectedDocument?.status === "Pending" && (
              <>
                <button
                  onClick={() => {
                    if (selectedDocument)
                      handleStatusUpdate(selectedDocument.id, "Approved");
                    setShowViewModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    if (selectedDocument)
                      handleStatusUpdate(selectedDocument.id, "Rejected");
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
                if (selectedDocument) openEditModal(selectedDocument);
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
            Delete Document
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedDocument?.title}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteDocument}
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
          <span className="text-gray-900 font-medium">Documents</span>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Documents
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
                placeholder="Search..."
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
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <SortHeader field="title" label="Title" />
                <SortHeader
                  field="documentCategory"
                  label="Document Category"
                />
                <SortHeader field="effectiveDate" label="Effective Date" />
                <SortHeader field="uploadedBy" label="Uploaded By" />
                <SortHeader field="approvedBy" label="Approved By" />
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
              {paginatedDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(doc)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {doc.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {doc.documentCategory}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(doc.effectiveDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doc.uploadedBy}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {doc.approvedBy || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}
                    >
                      {getStatusIcon(doc.status)}
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDocument(doc);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {getFileIcon(doc.fileName)}
                    </button>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(doc)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(doc)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(doc)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedDocuments.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No documents found.缓解
                  </td>{" "}
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
            {filteredDocuments.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredDocuments.length)} of{" "}
            {filteredDocuments.length} results
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
