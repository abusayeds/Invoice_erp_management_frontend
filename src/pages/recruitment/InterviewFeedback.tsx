/**
 * File: src/pages/recruitment/InterviewFeedback.tsx
 * Manage Interview Feedback – full CRUD with list view, view modal, and create/edit modal
 * Includes: search, pagination, sorting, star ratings, interview-dependent interviewers
 * Design matches provided screenshots and existing component patterns
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
  User,
  Briefcase,
  Calendar,
  Star,
  ThumbsUp,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interview {
  id: string;
  candidateName: string;
  candidatePosition: string;
  interviewers: string[];
}

interface InterviewFeedback {
  id: string;
  interviewId: string;
  candidateName: string;
  candidatePosition: string;
  interviewers: string[];
  submittedDate: string;
  technicalRating: number; // 1-5
  communicationRating: number; // 1-5
  culturalFitRating: number; // 1-5
  overallRating: number; // computed average or stored
  recommendation: "Strong Hire" | "Hire" | "No Hire" | "Strong No Hire";
  strengths: string;
  weaknesses: string;
  comments: string;
  createdAt: string;
}

// ─── Sample Data (based on screenshots) ───────────────────────────────────────

const interviews: Interview[] = [
  {
    id: "1",
    candidateName: "Megan Walker",
    candidatePosition: "Accounting Assistant",
    interviewers: ["Michael Brown"],
  },
  {
    id: "2",
    candidateName: "Michael Brown",
    candidatePosition: "Senior UX/UI Designer",
    interviewers: ["John Smith", "James Garcia"],
  },
  {
    id: "3",
    candidateName: "Stephanie Rodriguez",
    candidatePosition: "Social Media Manager",
    interviewers: ["Christopher Lee", "Daniel Thompson"],
  },
  {
    id: "4",
    candidateName: "Emily Davis",
    candidatePosition: "Data Engineer",
    interviewers: ["John Smith", "Matthew Clark"],
  },
  {
    id: "5",
    candidateName: "Lisa Anderson",
    candidatePosition: "HR Business Partner",
    interviewers: ["James Garcia", "Mark Allen"],
  },
];

const sampleFeedback: InterviewFeedback[] = [
  {
    id: "1",
    interviewId: "1",
    candidateName: "Megan Walker",
    candidatePosition: "Accounting Assistant",
    interviewers: ["Michael Brown"],
    submittedDate: "2026-02-11",
    technicalRating: 5,
    communicationRating: 4,
    culturalFitRating: 5,
    overallRating: 5,
    recommendation: "Strong Hire",
    strengths:
      "Exceptional problem-solving skills, deep understanding of system architecture, excellent coding practices",
    weaknesses: "Could improve presentation skills for client-facing scenarios",
    comments:
      "Outstanding candidate with strong technical foundation. Demonstrated excellent problem-solving approach and clean code implementation. Highly recommended for senior developer role.",
    createdAt: "2026-02-11",
  },
  {
    id: "2",
    interviewId: "2",
    candidateName: "Michael Brown",
    candidatePosition: "Senior UX/UI Designer",
    interviewers: ["John Smith", "James Garcia"],
    submittedDate: "2026-02-11",
    technicalRating: 4,
    communicationRating: 5,
    culturalFitRating: 4,
    overallRating: 4,
    recommendation: "Hire",
    strengths: "Great design portfolio, strong user empathy",
    weaknesses: "Needs more experience with design systems",
    comments: "Good cultural fit, would be a valuable addition.",
    createdAt: "2026-02-11",
  },
  {
    id: "3",
    interviewId: "3",
    candidateName: "Stephanie Rodriguez",
    candidatePosition: "Social Media Manager",
    interviewers: ["Christopher Lee", "Daniel Thompson"],
    submittedDate: "2026-02-11",
    technicalRating: 4,
    communicationRating: 5,
    culturalFitRating: 5,
    overallRating: 5,
    recommendation: "Hire",
    strengths: "Creative campaigns, excellent analytics skills",
    weaknesses: "Limited experience with paid social",
    comments: "Very enthusiastic and aligned with brand voice.",
    createdAt: "2026-02-11",
  },
  {
    id: "4",
    interviewId: "4",
    candidateName: "Emily Davis",
    candidatePosition: "Data Engineer",
    interviewers: ["John Smith", "Matthew Clark"],
    submittedDate: "2026-02-11",
    technicalRating: 5,
    communicationRating: 4,
    culturalFitRating: 4,
    overallRating: 4,
    recommendation: "Hire",
    strengths: "Strong SQL and Python skills",
    weaknesses: "Less experience with cloud platforms",
    comments: "Solid technical skills, quick learner.",
    createdAt: "2026-02-11",
  },
  {
    id: "5",
    interviewId: "5",
    candidateName: "Lisa Anderson",
    candidatePosition: "HR Business Partner",
    interviewers: ["James Garcia", "Mark Allen"],
    submittedDate: "2026-02-11",
    technicalRating: 5,
    communicationRating: 5,
    culturalFitRating: 5,
    overallRating: 5,
    recommendation: "Hire",
    strengths: "Excellent employee relations experience",
    weaknesses: "",
    comments: "Perfect fit for the role.",
    createdAt: "2026-02-11",
  },
];

type SortField =
  | "candidateName"
  | "interviewers"
  | "submittedDate"
  | "overallRating"
  | "recommendation";
type SortDir = "asc" | "desc";

// ─── Helper: Star Rating Display ─────────────────────────────────────────────

const StarRating: React.FC<{ rating: number; size?: number }> = ({
  rating,
  size = 4,
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-${size} h-${size} ${i < fullStars ? "text-yellow-400 fill-yellow-400" : i === fullStars && hasHalfStar ? "text-yellow-400 fill-yellow-400 opacity-50" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
};

const StarRatingInput: React.FC<{
  value: number;
  onChange: (rating: number) => void;
  label?: string;
}> = ({ value, onChange, label }) => {
  const [hover, setHover] = useState(0);
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 ${(hover || value) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const InterviewFeedback: React.FC = () => {
  const navigate = useNavigate();
  const [feedbackList, setFeedbackList] =
    useState<InterviewFeedback[]>(sampleFeedback);
  useEffect(() => {
    let alive = true;
    api.raw.get("/recruitment/interview-feedbacks/all").then((res) => {
      const arr = toArray<any>(res.data);
      if (!alive || !arr.length) return;
      const rid = (v: any) => (v && typeof v === "object" ? String(v._id) : String(v ?? ""));
      const cand = (v: any) => (v && typeof v === "object" ? `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim() || v.name || "" : "");
      const ymd = (v: any) => (v ? String(v).slice(0, 10) : "");
      setFeedbackList(arr.map((f: any) => ({
        id: String(f._id),
        interviewId: rid(f.interview_id),
        candidateName: (f.interview && typeof f.interview === "object" ? cand(f.interview.candidate_id) : "") || "",
        candidatePosition: "",
        interviewers: f.interviewer_names ?? [],
        submittedDate: ymd(f.createdAt),
        technicalRating: Number(f.technical_rating) || 0,
        communicationRating: Number(f.communication_rating) || 0,
        culturalFitRating: Number(f.cultural_fit_rating) || 0,
        overallRating: Number(f.overall_rating) || 0,
        recommendation: f.recommendation ?? "Hire",
        strengths: f.strengths ?? "",
        weaknesses: f.weaknesses ?? "",
        comments: f.comments ?? "",
        createdAt: ymd(f.createdAt),
      })) as InterviewFeedback[]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("submittedDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] =
    useState<InterviewFeedback | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    interviewId: "",
    interviewers: [] as string[],
    technicalRating: 5,
    communicationRating: 5,
    culturalFitRating: 5,
    recommendation: "Strong Hire" as InterviewFeedback["recommendation"],
    strengths: "",
    weaknesses: "",
    comments: "",
  });

  // ─── Derived data for interview list ───────────────────────────────────────

  const availableInterviews = useMemo(() => {
    // Exclude interviews that already have feedback
    const usedInterviewIds = new Set(feedbackList.map((f) => f.interviewId));
    return interviews.filter((i) => !usedInterviewIds.has(i.id));
  }, [feedbackList]);

  // When interview changes, update interviewers list
  const selectedInterview = interviews.find(
    (i) => i.id === formData.interviewId,
  );

  // ─── Sorting & Filtering ───────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const filteredFeedback = useMemo(() => {
    let result = [...feedbackList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.candidateName.toLowerCase().includes(q) ||
          f.interviewers.some((i) => i.toLowerCase().includes(q)) ||
          f.recommendation.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "interviewers") {
        aVal = a.interviewers.join(", ");
        bVal = b.interviewers.join(", ");
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [feedbackList, searchQuery, sortField, sortDir]);

  const totalPages = Math.ceil(filteredFeedback.length / perPage);
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      interviewId: "",
      interviewers: [],
      technicalRating: 5,
      communicationRating: 5,
      culturalFitRating: 5,
      recommendation: "Strong Hire",
      strengths: "",
      weaknesses: "",
      comments: "",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (feedback: InterviewFeedback) => {
    setSelectedFeedback(feedback);
    setFormData({
      interviewId: feedback.interviewId,
      interviewers: feedback.interviewers,
      technicalRating: feedback.technicalRating,
      communicationRating: feedback.communicationRating,
      culturalFitRating: feedback.culturalFitRating,
      recommendation: feedback.recommendation,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
      comments: feedback.comments,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (feedback: InterviewFeedback) => {
    setSelectedFeedback(feedback);
    setShowViewModal(true);
  };

  const openDeleteModal = (feedback: InterviewFeedback) => {
    setSelectedFeedback(feedback);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    if (!formData.interviewId) {
      showToast("Please select an interview", "info");
      return;
    }
    const interview = interviews.find((i) => i.id === formData.interviewId);
    if (!interview) return;

    const overallRating = Math.round(
      (formData.technicalRating +
        formData.communicationRating +
        formData.culturalFitRating) /
        3,
    );

    if (isEditing && selectedFeedback) {
      setFeedbackList((prev) =>
        prev.map((f) =>
          f.id === selectedFeedback.id
            ? {
                ...f,
                interviewId: formData.interviewId,
                candidateName: interview.candidateName,
                candidatePosition: interview.candidatePosition,
                interviewers: formData.interviewers.length
                  ? formData.interviewers
                  : interview.interviewers,
                technicalRating: formData.technicalRating,
                communicationRating: formData.communicationRating,
                culturalFitRating: formData.culturalFitRating,
                overallRating,
                recommendation: formData.recommendation,
                strengths: formData.strengths,
                weaknesses: formData.weaknesses,
                comments: formData.comments,
                submittedDate: new Date().toISOString().split("T")[0],
              }
            : f,
        ),
      );
      showToast("Feedback updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newId = (feedbackList.length + 1).toString();
      const newFeedback: InterviewFeedback = {
        id: newId,
        interviewId: formData.interviewId,
        candidateName: interview.candidateName,
        candidatePosition: interview.candidatePosition,
        interviewers: formData.interviewers.length
          ? formData.interviewers
          : interview.interviewers,
        submittedDate: new Date().toISOString().split("T")[0],
        technicalRating: formData.technicalRating,
        communicationRating: formData.communicationRating,
        culturalFitRating: formData.culturalFitRating,
        overallRating,
        recommendation: formData.recommendation,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        comments: formData.comments,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setFeedbackList((prev) => [newFeedback, ...prev]);
      showToast("Feedback submitted successfully!", "success");
      setShowCreateModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedFeedback) {
      setFeedbackList((prev) =>
        prev.filter((f) => f.id !== selectedFeedback.id),
      );
      showToast("Feedback deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedFeedback(null);
    }
  };

  // ─── Sort Header Component ─────────────────────────────────────────────────

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

  // ─── Helper to get recommendation badge ────────────────────────────────────

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case "Strong Hire":
        return "bg-green-100 text-green-700";
      case "Hire":
        return "bg-blue-100 text-blue-700";
      case "No Hire":
        return "bg-orange-100 text-orange-700";
      case "Strong No Hire":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

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
            Interview Feedback Details
          </h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedFeedback && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Candidate Information
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>{" "}
                  {selectedFeedback.candidateName}
                </div>
                <div>
                  <span className="text-gray-500">Position:</span>{" "}
                  {selectedFeedback.candidatePosition}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Ratings
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Technical</span>{" "}
                  <div className="flex items-center gap-2">
                    <StarRating
                      rating={selectedFeedback.technicalRating}
                      size={4}
                    />
                    <span>{selectedFeedback.technicalRating}/5</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Communication</span>{" "}
                  <div className="flex items-center gap-2">
                    <StarRating
                      rating={selectedFeedback.communicationRating}
                      size={4}
                    />
                    <span>{selectedFeedback.communicationRating}/5</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cultural Fit</span>{" "}
                  <div className="flex items-center gap-2">
                    <StarRating
                      rating={selectedFeedback.culturalFitRating}
                      size={4}
                    />
                    <span>{selectedFeedback.culturalFitRating}/5</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="font-medium">Overall</span>{" "}
                  <div className="flex items-center gap-2">
                    <StarRating
                      rating={selectedFeedback.overallRating}
                      size={4}
                    />
                    <span>{selectedFeedback.overallRating}/5</span>
                  </div>
                </div>
              </div>
            </div>
            {selectedFeedback.strengths && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  Strengths
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedFeedback.strengths}
                </p>
              </div>
            )}
            {selectedFeedback.weaknesses && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  Weaknesses
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedFeedback.weaknesses}
                </p>
              </div>
            )}
            {selectedFeedback.comments && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  Additional Comments
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedFeedback.comments}
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
          <button
            onClick={() => {
              setShowViewModal(false);
              if (selectedFeedback) openEditModal(selectedFeedback);
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
              {isEditing
                ? "Edit Interview Feedback"
                : "Create Interview Feedback"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update feedback details"
                : "Submit feedback for an interview"}
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
              Interview *
            </label>
            <select
              value={formData.interviewId}
              onChange={(e) => {
                const interviewId = e.target.value;
                const interview = interviews.find((i) => i.id === interviewId);
                setFormData({
                  ...formData,
                  interviewId,
                  interviewers: interview?.interviewers || [],
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              disabled={isEditing}
            >
              <option value="">Select Interview</option>
              {(isEditing ? interviews : availableInterviews).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.candidateName} - {i.candidatePosition}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interviewers *
            </label>
            <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
              {formData.interviewers.length > 0
                ? formData.interviewers.join(", ")
                : "Select interview first"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Interviewers are filtered based on selected interview.
            </p>
          </div>
          <div className="space-y-3">
            <StarRatingInput
              label="Technical Rating"
              value={formData.technicalRating}
              onChange={(r) => setFormData({ ...formData, technicalRating: r })}
            />
            <StarRatingInput
              label="Communication Rating"
              value={formData.communicationRating}
              onChange={(r) =>
                setFormData({ ...formData, communicationRating: r })
              }
            />
            <StarRatingInput
              label="Cultural Fit Rating"
              value={formData.culturalFitRating}
              onChange={(r) =>
                setFormData({ ...formData, culturalFitRating: r })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recommendation
            </label>
            <select
              value={formData.recommendation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recommendation: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Strong Hire">Strong Hire</option>
              <option value="Hire">Hire</option>
              <option value="No Hire">No Hire</option>
              <option value="Strong No Hire">Strong No Hire</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Strengths
            </label>
            <textarea
              rows={2}
              value={formData.strengths}
              onChange={(e) =>
                setFormData({ ...formData, strengths: e.target.value })
              }
              placeholder="Enter strengths"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weaknesses
            </label>
            <textarea
              rows={2}
              value={formData.weaknesses}
              onChange={(e) =>
                setFormData({ ...formData, weaknesses: e.target.value })
              }
              placeholder="Enter weaknesses"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments
            </label>
            <textarea
              rows={3}
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              placeholder="Enter comments"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
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
            {isEditing ? "Update" : "Submit"}
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
            Delete Feedback
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete feedback for{" "}
            <span className="font-semibold">
              {selectedFeedback?.candidateName}
            </span>
            ? This action cannot be undone.
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
            <span className="text-gray-900 font-medium">
              Interview Feedback
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>en English</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Interview Feedback
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
                placeholder="Search Interview Feedback..."
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
                    Recommendation
                  </div>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Strong Hire
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Hire
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    No Hire
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Strong No Hire
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

      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="candidateName" label="Candidate" />
                <SortHeader field="interviewers" label="Interviewer" />
                <SortHeader field="submittedDate" label="Submitted Date" />
                <SortHeader field="overallRating" label="Overall Rating" />
                <SortHeader field="recommendation" label="Recommendation" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedFeedback.map((feedback) => (
                <tr
                  key={feedback.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(feedback)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {feedback.candidateName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {feedback.candidatePosition}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {feedback.interviewers.join(", ")}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {feedback.submittedDate}
                  </td>
                  <td className="px-4 py-3">
                    <StarRating rating={feedback.overallRating} size={4} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRecommendationBadge(feedback.recommendation)}`}
                    >
                      {feedback.recommendation}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(feedback)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(feedback)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(feedback)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedFeedback.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No feedback found.缓解
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
            {filteredFeedback.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredFeedback.length)} of{" "}
            {filteredFeedback.length} results
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

      {(showCreateModal || showEditModal) && CreateEditModal()}
      {showViewModal && ViewModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};

export default InterviewFeedback;
