/**
 * File: src/pages/performance/EmployeeReviews.tsx
 * Complete Employee Reviews Management page with list view, create/edit modal, and details modal
 * Based on provided screenshots design
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { useResourceData } from "@/hooks/useResourceData";
import {
  employeeReviewHooks,
  reviewCycleHooks,
  employeeReviewActions,
  type EmployeeReview as ApiEmployeeReview,
} from "@/services/performance";
import { employeeHooks } from "@/services/hrm";
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
  Star,
  User,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RatingDetail {
  id: string;
  category: string;
  subCategory: string;
  score: number;
  maxScore: number;
}

interface EmployeeReview {
  id: string;
  employeeUserId: string;
  employee: string;
  reviewerId: string;
  reviewer: string;
  reviewCycleId: string;
  reviewCycle: string;
  reviewDate: string;
  rating: number;
  status: "Pending" | "InProgress" | "Completed" | "Cancelled";
  feedback: string;
  ratingDetails: RatingDetail[];
  createdAt: string;
}

// ─── Sample Data (offline fallback seed, API shape) ────────────────────────────

const sampleReviews: ApiEmployeeReview[] = [
  { id: "1", employee_user_id: "emp1", reviewer_id: "emp5", review_cycle_id: "rc1", review_date: "2025-09-11", status: "completed" },
  { id: "2", employee_user_id: "emp2", reviewer_id: "emp6", review_cycle_id: "rc2", review_date: "2025-10-11", status: "completed" },
  { id: "3", employee_user_id: "emp3", reviewer_id: "emp7", review_cycle_id: "rc3", review_date: "2026-02-06", status: "in_progress" },
  { id: "4", employee_user_id: "emp3", reviewer_id: "emp1", review_cycle_id: "rc1", review_date: "2026-02-01", status: "in_progress" },
  { id: "5", employee_user_id: "emp4", reviewer_id: "emp8", review_cycle_id: "rc4", review_date: "2026-02-16", status: "pending" },
];

// ─── API ↔ display mapping ─────────────────────────────────────────────────────

function mapReviewStatus(raw: string): EmployeeReview["status"] {
  const s = (raw ?? "pending").toLowerCase();
  if (s === "in_progress") return "InProgress";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  return "Pending";
}

function unwrapRef(v: any): { id: string; name: string } {
  if (v && typeof v === "object") {
    return { id: String(v._id ?? v.id ?? ""), name: v.name ?? "" };
  }
  return { id: String(v ?? ""), name: "" };
}

function mapFromApi(p: any): EmployeeReview {
  const emp = unwrapRef(p.employee_user_id ?? p.employeeUserId);
  const rev = unwrapRef(p.reviewer_id ?? p.reviewerId);
  const cycle = unwrapRef(p.review_cycle_id ?? p.reviewCycleId);
  return {
    id: String(p.id ?? p._id ?? ""),
    employeeUserId: emp.id,
    employee: emp.name,
    reviewerId: rev.id,
    reviewer: rev.name,
    reviewCycleId: cycle.id,
    reviewCycle: cycle.name,
    reviewDate: (p.review_date ?? p.reviewDate ?? "").slice(0, 10),
    rating: Number(p.rating ?? 0),
    status: mapReviewStatus(p.status ?? "pending"),
    feedback: p.feedback ?? p.pros ?? "",
    ratingDetails: [],
    createdAt: (p.createdAt ?? p.created_at ?? "").slice(0, 10),
  };
}

const staticEmployees = [
  "Daniel Thompson",
  "Matthew Clark",
  "John Smith",
  "Michael Brown",
  "David Wilson",
  "Anthony Walker",
  "James Garcia",
  "Robert Taylor",
  "Christopher Lee",
  "Mark Allen",
];

const staticReviewers = [
  "Anthony Walker",
  "David Wilson",
  "Robert Taylor",
  "Daniel Thompson",
  "James Garcia",
  "Michael Brown",
  "Matthew Clark",
  "John Smith",
];

const staticReviewCycles = [
  "2025 Mid-Year Performance Evaluation",
  "Executive Leadership Assessment",
  "Remote Work Performance Evaluation",
  "March 2025 Quarterly Prep Review",
  "Customer Service Excellence Review",
  "New Hire Probationary Assessment",
  "Annual Performance Review 2025",
  "Q4 2024 Quarterly Business Review",
];

const statuses = ["Pending", "InProgress", "Completed", "Cancelled"];

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

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <Star
          key={`full-${i}`}
          className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
        />
      ))}
      {hasHalfStar && (
        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="w-3.5 h-3.5 text-gray-300" />
      ))}
      <span className="ml-1 text-xs text-gray-500">({rating.toFixed(1)})</span>
    </div>
  );
};

type SortField =
  | "employee"
  | "reviewer"
  | "reviewCycle"
  | "reviewDate"
  | "rating"
  | "status";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const EmployeeReviews: React.FC = () => {
  const navigate = useNavigate();
  const {
    items: rawReviews,
    create,
    update,
    remove,
    refetch,
  } = useResourceData(employeeReviewHooks, { seed: sampleReviews, params: { page: 1, limit: 100 } });
  const reviews = useMemo(() => rawReviews.map(mapFromApi), [rawReviews]);

  // Dropdown options
  const empQuery = employeeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const employeeOptions = useMemo(
    () =>
      (empQuery.data ?? []).map((e: any) => ({
        id: String(e.id ?? e._id ?? ""),
        name:
          (typeof e.user_id === "object" ? e.user_id?.name : null) ??
          e.employee_id ??
          e.name ??
          "",
      })),
    [empQuery.data],
  );

  const cycleQuery = reviewCycleHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const reviewCycleOptions = useMemo(
    () =>
      (cycleQuery.data ?? []).map((c: any) => ({
        id: String(c.id ?? c._id ?? ""),
        name: c.name ?? "",
      })),
    [cycleQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("reviewDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConductModal, setShowConductModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<EmployeeReview | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Conduct/rate state
  const [conductForm, setConductForm] = useState<any>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");

  // Form state
  const [reviewFormData, setReviewFormData] = useState({
    employeeUserId: "",
    employee: "",
    reviewerId: "",
    reviewer: "",
    reviewCycleId: "",
    reviewCycle: "",
    reviewDate: "",
    status: "Pending" as "Pending" | "InProgress" | "Completed" | "Cancelled",
    feedback: "",
    rating: 0,
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

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.employee.toLowerCase().includes(q) ||
          r.reviewer.toLowerCase().includes(q) ||
          r.reviewCycle.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((r) => r.status === statusFilter);
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "rating") {
        aVal = a.rating;
        bVal = b.rating;
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [reviews, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredReviews.length / perPage);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetReviewForm = () => {
    setReviewFormData({
      employeeUserId: "",
      employee: "",
      reviewerId: "",
      reviewer: "",
      reviewCycleId: "",
      reviewCycle: "",
      reviewDate: "",
      status: "Pending",
      feedback: "",
      rating: 0,
    });
  };

  const openCreateModal = () => {
    resetReviewForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (review: EmployeeReview) => {
    setSelectedReview(review);
    setReviewFormData({
      employeeUserId: review.employeeUserId,
      employee: review.employee,
      reviewerId: review.reviewerId,
      reviewer: review.reviewer,
      reviewCycleId: review.reviewCycleId,
      reviewCycle: review.reviewCycle,
      reviewDate: review.reviewDate,
      status: review.status,
      feedback: review.feedback,
      rating: review.rating,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (review: EmployeeReview) => {
    setSelectedReview(review);
    setShowViewModal(true);
  };

  const openDeleteModal = (review: EmployeeReview) => {
    setSelectedReview(review);
    setShowDeleteModal(true);
  };

  const openConductModal = async (review: EmployeeReview) => {
    setSelectedReview(review);
    setRatings({});
    setPros("");
    setCons("");
    try {
      const form = await employeeReviewActions.getConductForm(review.id);
      setConductForm(form);
    } catch {
      setConductForm(null);
    }
    setShowConductModal(true);
  };

  const statusToApi = (s: string): ApiEmployeeReview["status"] => {
    if (s === "InProgress") return "in_progress";
    if (s === "Completed") return "completed";
    return "pending";
  };

  const handleSaveReview = async () => {
    if (!reviewFormData.employeeUserId && !reviewFormData.employee) {
      showToast("Please select an employee", "info");
      return;
    }
    if (!reviewFormData.reviewerId && !reviewFormData.reviewer) {
      showToast("Please select a reviewer", "info");
      return;
    }
    if (!reviewFormData.reviewCycleId && !reviewFormData.reviewCycle) {
      showToast("Please select a review cycle", "info");
      return;
    }
    if (!reviewFormData.reviewDate) {
      showToast("Please select review date", "info");
      return;
    }

    const payload: Partial<ApiEmployeeReview> = {
      employee_user_id: reviewFormData.employeeUserId || reviewFormData.employee,
      reviewer_id: reviewFormData.reviewerId || reviewFormData.reviewer,
      review_cycle_id: reviewFormData.reviewCycleId || reviewFormData.reviewCycle,
      review_date: reviewFormData.reviewDate,
      status: statusToApi(reviewFormData.status),
    };

    try {
      if (isEditing && selectedReview) {
        await update(selectedReview.id, payload);
        showToast("Review updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(payload);
        showToast("Review created successfully!", "success");
        setShowCreateModal(false);
      }
      resetReviewForm();
    } catch {
      showToast("Could not save review. Please try again.", "error");
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    try {
      await remove(selectedReview.id);
      showToast("Review deleted successfully!", "success");
    } catch {
      showToast("Could not delete review.", "error");
    }
    setShowDeleteModal(false);
    setSelectedReview(null);
  };

  const handleSubmitRatings = async () => {
    if (!selectedReview) return;
    try {
      await employeeReviewActions.submitRatings(selectedReview.id, { ratings, pros, cons });
      showToast("Ratings submitted successfully!", "success");
      refetch();
      setShowConductModal(false);
    } catch {
      showToast("Could not submit ratings. Please try again.", "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "InProgress":
        return "bg-yellow-100 text-yellow-700";
      case "Pending":
        return "bg-blue-100 text-blue-700";
      case "Cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="w-3 h-3" />;
      case "InProgress":
        return <TrendingUp className="w-3 h-3" />;
      case "Pending":
        return <Clock className="w-3 h-3" />;
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
              {isEditing ? "Edit Employee Review" : "Create Employee Review"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update review information"
                : "Add a new employee review"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetReviewForm();
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
              value={reviewFormData.employeeUserId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const opt = employeeOptions.find((em) => em.id === selectedId);
                setReviewFormData({
                  ...reviewFormData,
                  employeeUserId: selectedId,
                  employee: opt?.name ?? selectedId,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select employee</option>
              {employeeOptions.length > 0
                ? employeeOptions.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.name}
                    </option>
                  ))
                : staticEmployees.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reviewer *
            </label>
            <select
              value={reviewFormData.reviewerId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const opt = employeeOptions.find((em) => em.id === selectedId);
                setReviewFormData({
                  ...reviewFormData,
                  reviewerId: selectedId,
                  reviewer: opt?.name ?? selectedId,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select reviewer</option>
              {employeeOptions.length > 0
                ? employeeOptions.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.name}
                    </option>
                  ))
                : staticReviewers.map((rev) => (
                    <option key={rev} value={rev}>
                      {rev}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review Cycle *
            </label>
            <select
              value={reviewFormData.reviewCycleId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const opt = reviewCycleOptions.find((c) => c.id === selectedId);
                setReviewFormData({
                  ...reviewFormData,
                  reviewCycleId: selectedId,
                  reviewCycle: opt?.name ?? selectedId,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select review cycle</option>
              {reviewCycleOptions.length > 0
                ? reviewCycleOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                : staticReviewCycles.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {cycle}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review Date *
            </label>
            <input
              type="date"
              value={reviewFormData.reviewDate}
              onChange={(e) =>
                setReviewFormData({
                  ...reviewFormData,
                  reviewDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={reviewFormData.status}
              onChange={(e) =>
                setReviewFormData({
                  ...reviewFormData,
                  status: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating (0-5)
            </label>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={reviewFormData.rating || ""}
              onChange={(e) =>
                setReviewFormData({
                  ...reviewFormData,
                  rating: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback
            </label>
            <textarea
              value={reviewFormData.feedback}
              onChange={(e) =>
                setReviewFormData({
                  ...reviewFormData,
                  feedback: e.target.value,
                })
              }
              rows={3}
              placeholder="Enter feedback"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetReviewForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveReview}
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Employee Review Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedReview?.employee}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedReview && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedReview.employee}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reviewer</p>
                <p className="text-sm text-gray-600">
                  {selectedReview.reviewer}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Review Cycle</p>
                <p className="text-sm text-gray-600">
                  {selectedReview.reviewCycle}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Review Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedReview.reviewDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Average Rating</p>
                <div className="flex items-center gap-1">
                  {renderStars(selectedReview.rating)}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReview.status)}`}
                >
                  {getStatusIcon(selectedReview.status)}
                  {selectedReview.status === "InProgress"
                    ? "In Progress"
                    : selectedReview.status}
                </span>
              </div>
            </div>
            {selectedReview.ratingDetails.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Performance Ratings
                </h3>
                <div className="space-y-4">
                  {selectedReview.ratingDetails.map((detail) => (
                    <div
                      key={detail.id}
                      className="border-b border-gray-100 pb-3"
                    >
                      <p className="text-sm font-medium text-gray-700">
                        {detail.category}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {detail.subCategory}
                        </span>
                        <div className="flex items-center gap-2">
                          {renderStars(detail.score)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedReview.feedback && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Feedback</h3>
                <p className="text-sm text-gray-600">
                  {selectedReview.feedback}
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
          {selectedReview && selectedReview.status !== "Completed" && (
            <button
              onClick={() => {
                setShowViewModal(false);
                openConductModal(selectedReview);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Rate
            </button>
          )}
          <button
            onClick={() => {
              setShowViewModal(false);
              if (selectedReview) openEditModal(selectedReview);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );

  const ConductModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Conduct Review</h2>
            <p className="text-sm text-gray-500 mt-0.5">{selectedReview?.employee}</p>
          </div>
          <button onClick={() => setShowConductModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {conductForm && Array.isArray(conductForm.indicators) && conductForm.indicators.map((ind: any) => (
            <div key={ind.id ?? ind._id} className="border-b border-gray-100 pb-3">
              <p className="text-sm font-medium text-gray-700">{ind.name}</p>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                placeholder="Rating (0-5)"
                value={ratings[String(ind.id ?? ind._id)] ?? ""}
                onChange={(e) =>
                  setRatings({ ...ratings, [String(ind.id ?? ind._id)]: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-32 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          ))}
          {!conductForm && (
            <p className="text-sm text-gray-500">No indicators loaded. You can still submit pros/cons.</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pros</label>
            <textarea value={pros} onChange={(e) => setPros(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cons</label>
            <textarea value={cons} onChange={(e) => setCons(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button onClick={() => setShowConductModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmitRatings} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Submit Ratings</button>
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
            Delete Review
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete this review for{" "}
            <span className="font-semibold">{selectedReview?.employee}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteReview}
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
            onClick={() => navigate("/performance")}
            className="hover:text-gray-700"
          >
            Performance
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Employee Reviews</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Employee Reviews
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
                      setStatusFilter("InProgress");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Completed");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Completed
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
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <SortHeader field="employee" label="Employee" />
                <SortHeader field="reviewer" label="Reviewer" />
                <SortHeader field="reviewCycle" label="Review Cycle" />
                <SortHeader field="reviewDate" label="Review Date" />
                <SortHeader field="rating" label="Rating" />
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedReviews.map((review) => (
                <tr
                  key={review.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(review)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {review.employee}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{review.reviewer}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {review.reviewCycle}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(review.reviewDate)}
                  </td>
                  <td className="px-4 py-3">{renderStars(review.rating)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}
                    >
                      {getStatusIcon(review.status)}
                      {review.status === "InProgress"
                        ? "In Progress"
                        : review.status}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(review)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(review)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(review)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedReviews.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No employee reviews found.
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
            {filteredReviews.length === 0 ? 0 : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredReviews.length)} of{" "}
            {filteredReviews.length} results
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

      {/* Modals */}
      {(showCreateModal || showEditModal) && CreateEditModal()}
      {showViewModal && ViewModal()}
      {showConductModal && ConductModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};
