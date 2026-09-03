/**
 * File: src/pages/recruitment/CandidateAssessments.tsx
 * Manage Candidate Assessments – full CRUD with list view, view modal, and edit/create modal
 * Includes: search, pagination, sorting, filters, score calculation, candidate filtering
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
  FileText,
  Calendar,
  Award,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  name: string;
}

interface Assessment {
  id: string;
  name: string;
  description?: string;
}

type AssessmentStatus = "Pass" | "Fail";

interface CandidateAssessment {
  id: string;
  candidateId: string;
  candidateName: string;
  assessmentId: string;
  assessmentName: string;
  score: number;
  maxScore: number;
  conductedBy: string;
  status: AssessmentStatus;
  assessmentDate: string;
  comments: string;
  createdAt: string;
}

// ─── Sample Data (based on screenshots) ───────────────────────────────────────

const candidates: Candidate[] = [
  { id: "1", name: "Brian Clark" },
  { id: "2", name: "Lisa Anderson" },
  { id: "3", name: "Michael Brown" },
  { id: "4", name: "Kevin Thompson" },
  { id: "5", name: "Robert Garcia" },
  { id: "6", name: "Megan Walker" },
  { id: "7", name: "Michelle White" },
  { id: "8", name: "Emily Davis" },
  { id: "9", name: "Stephanie Rodriguez" },
  { id: "10", name: "Daniel Harris" },
];

const assessments: Assessment[] = [
  { id: "1", name: "Frontend Development Test" },
  { id: "2", name: "Unit Testing Skills" },
  { id: "3", name: "Algorithm Challenge" },
  { id: "4", name: "Backend API Test" },
  { id: "5", name: "Database Design Test" },
  { id: "6", name: "Problem Solving Assessment" },
  { id: "7", name: "System Design Interview" },
  { id: "8", name: "Coding Challenge" },
];

const sampleAssessments: CandidateAssessment[] = [
  {
    id: "1",
    candidateId: "1",
    candidateName: "Brian Clark",
    assessmentId: "1",
    assessmentName: "Frontend Development Test",
    score: 43,
    maxScore: 50,
    conductedBy: "David Wilson",
    status: "Pass",
    assessmentDate: "2026-02-01",
    comments: "Impressive debugging skills and code quality.",
    createdAt: "2026-01-20",
  },
  {
    id: "2",
    candidateId: "2",
    candidateName: "Lisa Anderson",
    assessmentId: "2",
    assessmentName: "Unit Testing Skills",
    score: 45,
    maxScore: 120,
    conductedBy: "Christopher Lee",
    status: "Pass",
    assessmentDate: "2026-01-30",
    comments: "Good understanding of testing frameworks.",
    createdAt: "2026-01-25",
  },
  {
    id: "3",
    candidateId: "3",
    candidateName: "Michael Brown",
    assessmentId: "3",
    assessmentName: "Algorithm Challenge",
    score: 44,
    maxScore: 100,
    conductedBy: "Matthew Clark",
    status: "Pass",
    assessmentDate: "2025-11-29",
    comments: "Strong problem-solving approach.",
    createdAt: "2025-11-20",
  },
  {
    id: "4",
    candidateId: "4",
    candidateName: "Kevin Thompson",
    assessmentId: "4",
    assessmentName: "Backend API Test",
    score: 9,
    maxScore: 50,
    conductedBy: "Mark Allen",
    status: "Fail",
    assessmentDate: "2025-12-17",
    comments: "Needs improvement in API design.",
    createdAt: "2025-12-10",
  },
  {
    id: "5",
    candidateId: "5",
    candidateName: "Robert Garcia",
    assessmentId: "5",
    assessmentName: "Database Design Test",
    score: 149,
    maxScore: 150,
    conductedBy: "Michael Brown",
    status: "Pass",
    assessmentDate: "2026-01-07",
    comments: "Excellent database normalization skills.",
    createdAt: "2026-01-02",
  },
  {
    id: "6",
    candidateId: "1",
    candidateName: "Brian Clark",
    assessmentId: "2",
    assessmentName: "Unit Testing Skills",
    score: 17,
    maxScore: 100,
    conductedBy: "John Smith",
    status: "Fail",
    assessmentDate: "2025-12-05",
    comments: "Weak in unit testing concepts.",
    createdAt: "2025-11-28",
  },
  {
    id: "7",
    candidateId: "6",
    candidateName: "Megan Walker",
    assessmentId: "6",
    assessmentName: "Problem Solving Assessment",
    score: 60,
    maxScore: 150,
    conductedBy: "Anthony Walker",
    status: "Fail",
    assessmentDate: "2026-02-02",
    comments: "Needs more practice.",
    createdAt: "2026-01-28",
  },
  {
    id: "8",
    candidateId: "7",
    candidateName: "Michelle White",
    assessmentId: "3",
    assessmentName: "Algorithm Challenge",
    score: 66,
    maxScore: 100,
    conductedBy: "Robert Taylor",
    status: "Pass",
    assessmentDate: "2026-02-03",
    comments: "Good algorithmic thinking.",
    createdAt: "2026-01-30",
  },
];

// Generate additional assessments to reach ~20 rows
for (let i = 9; i <= 25; i++) {
  const candidate = candidates[i % candidates.length];
  const assessment = assessments[i % assessments.length];
  const score = Math.floor(
    Math.random() * (assessment.name.includes("Test") ? 100 : 150),
  );
  const maxScore = assessment.name.includes("Test") ? 100 : 150;
  sampleAssessments.push({
    id: i.toString(),
    candidateId: candidate.id,
    candidateName: candidate.name,
    assessmentId: assessment.id,
    assessmentName: assessment.name,
    score: score,
    maxScore: maxScore,
    conductedBy: [
      "David Wilson",
      "Christopher Lee",
      "Matthew Clark",
      "Mark Allen",
      "Michael Brown",
      "John Smith",
      "Anthony Walker",
      "Robert Taylor",
    ][i % 8],
    status: score > maxScore * 0.6 ? "Pass" : "Fail",
    assessmentDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    comments: `Assessment comment for ${candidate.name}`,
    createdAt: "2026-01-01",
  });
}

type SortField =
  | "candidateName"
  | "assessmentName"
  | "score"
  | "conductedBy"
  | "status"
  | "assessmentDate";
type SortDir = "asc" | "desc";

// ─── Helper: Score display ───────────────────────────────────────────────────

const formatScore = (score: number, maxScore: number): string => {
  return `${score} / ${maxScore}`;
};

const getPercentage = (score: number, maxScore: number): number => {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const CandidateAssessments: React.FC = () => {
  const navigate = useNavigate();
  const [assessmentsList, setAssessmentsList] =
    useState<CandidateAssessment[]>(sampleAssessments);
  useEffect(() => {
    let alive = true;
    api.raw.get("/recruitment/candidate-assessments/all").then((res) => {
      const arr = toArray<any>(res.data);
      if (!alive || !arr.length) return;
      const rid = (v: any) => (v && typeof v === "object" ? String(v._id) : String(v ?? ""));
      const cand = (v: any) => (v && typeof v === "object" ? `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim() || v.name || "" : "");
      setAssessmentsList(arr.map((a: any) => ({
        id: String(a._id),
        candidateId: rid(a.candidate_id),
        candidateName: cand(a.candidate_id),
        assessmentId: "",
        assessmentName: a.assessment_name ?? "",
        score: Number(a.score) || 0,
        maxScore: Number(a.max_score) || 0,
        conductedBy: (a.conducted_by && typeof a.conducted_by === "object" ? a.conducted_by.name : a.conducted_by) || "",
        status: a.pass_fail_status ?? "Pending",
        assessmentDate: a.assessment_date ? String(a.assessment_date).slice(0, 10) : "",
        comments: a.comments ?? "",
        createdAt: a.createdAt ? String(a.createdAt).slice(0, 10) : "",
      })) as CandidateAssessment[]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("assessmentDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] =
    useState<CandidateAssessment | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    candidateId: "",
    assessmentId: "",
    score: 0,
    maxScore: 0,
    conductedBy: "",
    status: "Pass" as AssessmentStatus,
    assessmentDate: "",
    comments: "",
  });

  // ─── For candidate filter: only candidates with "Strong Hire"/"Hire" recommendations
  // In a real app, this would come from an API. For demo, we'll simulate.
  const eligibleCandidates = useMemo(() => {
    // Simulate: candidates with Strong Hire/Hire recommendations from interview feedback
    const eligibleIds = ["1", "3", "5", "6", "8", "9"]; // Brian, Michael, Robert, Megan, Emily, Stephanie
    return candidates.filter((c) => eligibleIds.includes(c.id));
  }, []);

  // ─── Sorting & Filtering ───────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const filteredAssessments = useMemo(() => {
    let result = [...assessmentsList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.candidateName.toLowerCase().includes(q) ||
          a.assessmentName.toLowerCase().includes(q) ||
          a.conductedBy.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All")
      result = result.filter((a) => a.status === statusFilter);
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "score") {
        aVal = a.score / a.maxScore;
        bVal = b.score / b.maxScore;
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [assessmentsList, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredAssessments.length / perPage);
  const paginatedAssessments = filteredAssessments.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      candidateId: "",
      assessmentId: "",
      score: 0,
      maxScore: 0,
      conductedBy: "",
      status: "Pass",
      assessmentDate: "",
      comments: "",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (assessment: CandidateAssessment) => {
    setSelectedAssessment(assessment);
    setFormData({
      candidateId: assessment.candidateId,
      assessmentId: assessment.assessmentId,
      score: assessment.score,
      maxScore: assessment.maxScore,
      conductedBy: assessment.conductedBy,
      status: assessment.status,
      assessmentDate: assessment.assessmentDate,
      comments: assessment.comments,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (assessment: CandidateAssessment) => {
    setSelectedAssessment(assessment);
    setShowViewModal(true);
  };

  const openDeleteModal = (assessment: CandidateAssessment) => {
    setSelectedAssessment(assessment);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    if (!formData.candidateId) {
      showToast("Please select a candidate", "info");
      return;
    }
    if (!formData.assessmentId) {
      showToast("Please select an assessment", "info");
      return;
    }
    if (formData.score < 0 || formData.maxScore <= 0) {
      showToast("Score and max score must be valid", "info");
      return;
    }
    if (!formData.conductedBy.trim()) {
      showToast("Conducted by is required", "info");
      return;
    }
    if (!formData.assessmentDate) {
      showToast("Assessment date is required", "info");
      return;
    }

    const selectedCandidate = candidates.find(
      (c) => c.id === formData.candidateId,
    );
    const selectedAssessmentType = assessments.find(
      (a) => a.id === formData.assessmentId,
    );
    const status = formData.score >= formData.maxScore * 0.6 ? "Pass" : "Fail";

    if (isEditing && selectedAssessment) {
      setAssessmentsList((prev) =>
        prev.map((a) =>
          a.id === selectedAssessment.id
            ? {
                ...a,
                candidateId: formData.candidateId,
                candidateName: selectedCandidate?.name || "",
                assessmentId: formData.assessmentId,
                assessmentName: selectedAssessmentType?.name || "",
                score: formData.score,
                maxScore: formData.maxScore,
                conductedBy: formData.conductedBy.trim(),
                status,
                assessmentDate: formData.assessmentDate,
                comments: formData.comments.trim(),
              }
            : a,
        ),
      );
      showToast("Assessment updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newId = (assessmentsList.length + 1).toString();
      const newAssessment: CandidateAssessment = {
        id: newId,
        candidateId: formData.candidateId,
        candidateName: selectedCandidate?.name || "",
        assessmentId: formData.assessmentId,
        assessmentName: selectedAssessmentType?.name || "",
        score: formData.score,
        maxScore: formData.maxScore,
        conductedBy: formData.conductedBy.trim(),
        status,
        assessmentDate: formData.assessmentDate,
        comments: formData.comments.trim(),
        createdAt: new Date().toISOString().split("T")[0],
      };
      setAssessmentsList((prev) => [newAssessment, ...prev]);
      showToast("Assessment created successfully!", "success");
      setShowCreateModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedAssessment) {
      setAssessmentsList((prev) =>
        prev.filter((a) => a.id !== selectedAssessment.id),
      );
      showToast("Assessment deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedAssessment(null);
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

  // ─── Helper for status badge ───────────────────────────────────────────────

  const getStatusBadge = (status: AssessmentStatus) => {
    return status === "Pass"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
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
            Candidate Assessment Details
          </h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedAssessment && (
          <div className="p-6 space-y-5">
            <div>
              <span className="text-gray-500">Assessment Name:</span>{" "}
              <div className="font-medium">
                {selectedAssessment.assessmentName}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Assessment Date:</span>{" "}
              {selectedAssessment.assessmentDate}
            </div>
            <div>
              <span className="text-gray-500">Candidate:</span>{" "}
              {selectedAssessment.candidateName}
            </div>
            <div>
              <span className="text-gray-500">Status:</span>{" "}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedAssessment.status)}`}
              >
                {selectedAssessment.status}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Conducted By:</span>{" "}
              {selectedAssessment.conductedBy}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">
                {selectedAssessment.score}
              </div>
              <div className="text-sm text-gray-500">Score</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {selectedAssessment.maxScore}
              </div>
              <div className="text-sm text-gray-500">Max Score</div>
              <div className="mt-3 text-lg font-semibold text-blue-600">
                {getPercentage(
                  selectedAssessment.score,
                  selectedAssessment.maxScore,
                )}
                %
              </div>
              <div className="text-sm text-gray-500">Percentage</div>
            </div>
            {selectedAssessment.comments && (
              <div>
                <span className="text-gray-500">Comments:</span>{" "}
                <p className="mt-1 text-gray-700">
                  {selectedAssessment.comments}
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
              if (selectedAssessment) openEditModal(selectedAssessment);
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
                ? "Edit Candidate Assessment"
                : "Create Candidate Assessment"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update assessment details"
                : "Add a new assessment result"}
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
              Candidate *
            </label>
            <select
              value={formData.candidateId}
              onChange={(e) =>
                setFormData({ ...formData, candidateId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select Candidate</option>
              {eligibleCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Only candidates with Strong Hire/Hire recommendations are shown.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Name *
            </label>
            <select
              value={formData.assessmentId}
              onChange={(e) => {
                const assessment = assessments.find(
                  (a) => a.id === e.target.value,
                );
                setFormData({
                  ...formData,
                  assessmentId: e.target.value,
                  maxScore: assessment?.name.includes("Test") ? 100 : 150,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select Assessment</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score
              </label>
              <input
                type="number"
                min="0"
                max={formData.maxScore}
                value={formData.score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    score: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Score
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxScore}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxScore: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as AssessmentStatus,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conducted by *
            </label>
            <input
              type="text"
              value={formData.conductedBy}
              onChange={(e) =>
                setFormData({ ...formData, conductedBy: e.target.value })
              }
              placeholder="Enter name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-400 mt-1">
              Conducted by are users with staff role.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Date *
            </label>
            <input
              type="date"
              value={formData.assessmentDate}
              onChange={(e) =>
                setFormData({ ...formData, assessmentDate: e.target.value })
              }
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
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
            Delete Assessment
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete the assessment for{" "}
            <span className="font-semibold">
              {selectedAssessment?.candidateName}
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
              Candidate Assessments
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
            Manage Candidate Assessments
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
                placeholder="Search by Assessment, Candidate, Conducted By..."
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
                    Status
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
                      setStatusFilter("Pass");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Fail");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Fail
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
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="candidateName" label="Candidate" />
                <SortHeader field="assessmentName" label="Assessment" />
                <SortHeader field="score" label="Score" />
                <SortHeader field="conductedBy" label="Conducted By" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="assessmentDate" label="Assessment Date" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedAssessments.map((assessment) => (
                <tr
                  key={assessment.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(assessment)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {assessment.candidateName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {assessment.assessmentName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatScore(assessment.score, assessment.maxScore)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {assessment.conductedBy}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(assessment.status)}`}
                    >
                      {assessment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {assessment.assessmentDate}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(assessment)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(assessment)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(assessment)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedAssessments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No assessments found.缓解
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
            {filteredAssessments.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredAssessments.length)} of{" "}
            {filteredAssessments.length} results
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

export default CandidateAssessments;
