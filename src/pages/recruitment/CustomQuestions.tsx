/**
 * File: src/pages/recruitment/CustomQuestions.tsx
 * Manage Custom Questions – full CRUD with list view, view modal, and edit/create modal
 * Design matches screenshots and existing component patterns
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
  CheckCircle,
  XCircle,
  Globe,
  HelpCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "Text" | "Number" | "Radio" | "Select" | "Textarea";

interface CustomQuestion {
  id: string;
  question: string;
  sortOrder: number;
  type: QuestionType;
  isRequired: boolean; // true = Required, false = Optional
  isActive: boolean;
  createdAt: string;
}

// ─── Sample Data (based on screenshots) ───────────────────────────────────────

const sampleQuestions: CustomQuestion[] = [
  {
    id: "1",
    question: "How many years of total work experience do you have?",
    sortOrder: 11,
    type: "Number",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    question: "What is your current job title?",
    sortOrder: 21,
    type: "Text",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    question: "Portfolio or GitHub URL",
    sortOrder: 20,
    type: "Text",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    question: "Do you have a valid driver license?",
    sortOrder: 19,
    type: "Radio",
    isRequired: false,
    isActive: false,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    question: "Rate your English proficiency",
    sortOrder: 18,
    type: "Select",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    question: "What motivates you in your work?",
    sortOrder: 17,
    type: "Textarea",
    isRequired: false,
    isActive: false,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    question: "Do you have experience working remotely?",
    sortOrder: 16,
    type: "Radio",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    question: "What is your notice period?",
    sortOrder: 15,
    type: "Select",
    isRequired: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    question: "Do you have any professional certifications?",
    sortOrder: 14,
    type: "Textarea",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
];

// Generate additional to reach 21 as shown in screenshot footer
for (let i = 10; i <= 21; i++) {
  sampleQuestions.push({
    id: i.toString(),
    question: `Additional custom question ${i}`,
    sortOrder: 30 + i,
    type:
      i % 4 === 0
        ? "Radio"
        : i % 3 === 0
          ? "Select"
          : i % 2 === 0
            ? "Text"
            : "Number",
    isRequired: i % 5 === 0,
    isActive: i % 3 !== 0,
    createdAt: "2024-01-01",
  });
}

type SortField = "question" | "sortOrder" | "type" | "isRequired" | "isActive";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const CustomQuestions: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<CustomQuestion[]>(sampleQuestions);
  useEffect(() => {
    let alive = true;
    api.raw.get("/recruitment/custom-questions/all").then((res) => {
      const arr = toArray<any>(res.data);
      if (!alive || !arr.length) return;
      setQuestions(arr.map((q: any) => ({
        id: String(q._id),
        question: q.question ?? "",
        sortOrder: Number(q.sort_order) || 0,
        type: q.type,
        isRequired: !!q.is_required,
        isActive: q.is_active !== false,
        createdAt: q.createdAt ? String(q.createdAt).slice(0, 10) : "",
      })) as CustomQuestion[]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("sortOrder");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] =
    useState<CustomQuestion | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    question: "",
    sortOrder: 0,
    type: "Text" as QuestionType,
    isRequired: false,
    isActive: true,
  });

  // ─── Sorting & Filtering ───────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const filteredQuestions = useMemo(() => {
    let result = [...questions];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((qst) => qst.question.toLowerCase().includes(q));
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
  }, [questions, searchQuery, sortField, sortDir]);

  const totalPages = Math.ceil(filteredQuestions.length / perPage);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      question: "",
      sortOrder: 0,
      type: "Text",
      isRequired: false,
      isActive: true,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (question: CustomQuestion) => {
    setSelectedQuestion(question);
    setFormData({
      question: question.question,
      sortOrder: question.sortOrder,
      type: question.type,
      isRequired: question.isRequired,
      isActive: question.isActive,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (question: CustomQuestion) => {
    setSelectedQuestion(question);
    setShowViewModal(true);
  };

  const openDeleteModal = (question: CustomQuestion) => {
    setSelectedQuestion(question);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    if (!formData.question.trim()) {
      showToast("Please enter the question text", "info");
      return;
    }
    if (formData.sortOrder <= 0) {
      showToast("Sort order must be a positive number", "info");
      return;
    }

    if (isEditing && selectedQuestion) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === selectedQuestion.id
            ? {
                ...q,
                question: formData.question.trim(),
                sortOrder: formData.sortOrder,
                type: formData.type,
                isRequired: formData.isRequired,
                isActive: formData.isActive,
              }
            : q,
        ),
      );
      showToast("Custom question updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newQuestion: CustomQuestion = {
        id: Date.now().toString(),
        question: formData.question.trim(),
        sortOrder: formData.sortOrder,
        type: formData.type,
        isRequired: formData.isRequired,
        isActive: formData.isActive,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setQuestions((prev) => [newQuestion, ...prev]);
      showToast("Custom question created successfully!", "success");
      setShowCreateModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedQuestion) {
      setQuestions((prev) => prev.filter((q) => q.id !== selectedQuestion.id));
      showToast("Custom question deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedQuestion(null);
    }
  };

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

  const ViewModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Custom Question Details
          </h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedQuestion && (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-500">Question</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedQuestion.question}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Sort Order</p>
                <p className="text-sm text-gray-600">
                  {selectedQuestion.sortOrder}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm text-gray-600">{selectedQuestion.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Required</p>
                <p className="text-sm text-gray-600">
                  {selectedQuestion.isRequired ? "Required" : "Optional"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${selectedQuestion.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  {selectedQuestion.isActive ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {selectedQuestion.isActive ? "Active" : "Inactive"}
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
              if (selectedQuestion) openEditModal(selectedQuestion);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );

  const CreateEditModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Edit Custom Question" : "Create Custom Question"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update question information"
                : "Add a new custom question"}
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
              Question *
            </label>
            <textarea
              rows={2}
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              placeholder="Enter your question here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as QuestionType,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Text">Text</option>
              <option value="Number">Number</option>
              <option value="Radio">Radio</option>
              <option value="Select">Select</option>
              <option value="Textarea">Textarea</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <input
              type="number"
              min={1}
              value={formData.sortOrder || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sortOrder: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) =>
                  setFormData({ ...formData, isRequired: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Is Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Is Active</span>
            </label>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Custom Question
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedQuestion?.question}</span>?
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
              onClick={() => navigate("/recruitment")}
              className="hover:text-gray-700"
            >
              Recruitment
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">Custom Questions</span>
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
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Custom Questions
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
                placeholder="Search Custom Questions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={() => showToast("Search applied", "info")}
              className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600"
            >
              Search
            </button>
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
                    <span className="text-xs font-medium text-gray-500">
                      Type
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Text
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Number
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Radio
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Textarea
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <div className="px-3 pb-1.5 mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      Required
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Required
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Optional
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <div className="px-3 pb-1.5 mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      Status
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Active
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Inactive
                  </button>
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
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="question" label="Question" />
                <SortHeader field="sortOrder" label="Sort Order" />
                <SortHeader field="type" label="Type" />
                <SortHeader field="isRequired" label="Is Required" />
                <SortHeader field="isActive" label="Is Active" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedQuestions.map((q) => (
                <tr
                  key={q.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(q)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-md truncate">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                      {q.question}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.sortOrder}</td>
                  <td className="px-4 py-3 text-gray-600">{q.type}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {q.isRequired ? "Required" : "Optional"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${q.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {q.isActive ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {q.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(q)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(q)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedQuestions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No custom questions found.缓解
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
            {filteredQuestions.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredQuestions.length)} of{" "}
            {filteredQuestions.length} results
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

export default CustomQuestions;
