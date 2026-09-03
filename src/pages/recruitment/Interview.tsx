/**
 * File: src/pages/recruitment/Interviews.tsx
 * Manage Interviews – full CRUD with list view, view modal, and edit/create modal
 * Includes: search, pagination, sorting, filters, schedule management
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
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  name: string;
  jobTitle: string;
}

interface InterviewRound {
  id: string;
  name: string;
}

type InterviewType =
  | "Panel Interview"
  | "In-Person Interview"
  | "Phone Interview"
  | "Video Interview"
  | "Behavioral Interview"
  | "Final Interview"
  | "Technical Assessment"
  | "Portfolio Review"
  | "Manager Interview"
  | "Cultural Fit Assessment"
  | "Case Study";

type InterviewStatus = "Scheduled" | "Completed" | "Cancelled";

type FeedbackStatus = "Pending" | "Submitted";

interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateJobTitle: string;
  roundId: string;
  roundName: string;
  interviewType: InterviewType;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  location: string;
  meetingLink: string;
  interviewers: string[];
  status: InterviewStatus;
  feedbackStatus: FeedbackStatus;
  createdAt: string;
}

// ─── Sample Data (based on screenshots) ───────────────────────────────────────

const candidates: Candidate[] = [
  { id: "1", name: "Megan Walker", jobTitle: "Accounting Assistant" },
  { id: "2", name: "Michael Brown", jobTitle: "Senior UX/UI Designer" },
  { id: "3", name: "Robert Garcia", jobTitle: "Sales Manager" },
  { id: "4", name: "Stephanie Rodriguez", jobTitle: "Social Media Manager" },
  { id: "5", name: "Brian Clark", jobTitle: "Graphic Designer" },
  { id: "6", name: "Daniel Harris", jobTitle: "Customer Success Manager" },
  { id: "7", name: "Emily Davis", jobTitle: "Data Engineer" },
  { id: "8", name: "Andrew Lewis", jobTitle: "Data Scientist" },
  { id: "9", name: "Lisa Anderson", jobTitle: "HR Business Partner" },
];

const interviewRounds: InterviewRound[] = [
  { id: "1", name: "Technical Assessment" },
  { id: "2", name: "Portfolio Review" },
  { id: "3", name: "Behavioral Interview" },
  { id: "4", name: "Manager Interview" },
  { id: "5", name: "Cultural Fit Assessment" },
  { id: "6", name: "Case Study" },
  { id: "7", name: "HR Discussion" },
];

const sampleInterviews: Interview[] = [
  {
    id: "1",
    candidateId: "1",
    candidateName: "Megan Walker",
    candidateJobTitle: "Accounting Assistant",
    roundId: "1",
    roundName: "Technical Assessment",
    interviewType: "Panel Interview",
    scheduledDate: "2026-02-06",
    scheduledTime: "10:00",
    durationMinutes: 90,
    location: "Conference Room A",
    meetingLink: "",
    interviewers: ["Michael Brown"],
    status: "Completed",
    feedbackStatus: "Submitted",
    createdAt: "2026-01-20",
  },
  {
    id: "2",
    candidateId: "2",
    candidateName: "Michael Brown",
    candidateJobTitle: "Senior UX/UI Designer",
    roundId: "2",
    roundName: "Portfolio Review",
    interviewType: "In-Person Interview",
    scheduledDate: "2026-02-28",
    scheduledTime: "16:00",
    durationMinutes: 45,
    location: "HR Office",
    meetingLink: "",
    interviewers: [],
    status: "Completed",
    feedbackStatus: "Submitted",
    createdAt: "2026-01-25",
  },
  {
    id: "3",
    candidateId: "3",
    candidateName: "Robert Garcia",
    candidateJobTitle: "Sales Manager",
    roundId: "3",
    roundName: "Behavioral Interview",
    interviewType: "Behavioral Interview",
    scheduledDate: "2026-02-04",
    scheduledTime: "16:00",
    durationMinutes: 60,
    location: "Online",
    meetingLink: "https://meet.example.com/robert",
    interviewers: [],
    status: "Scheduled",
    feedbackStatus: "Pending",
    createdAt: "2026-01-28",
  },
  {
    id: "4",
    candidateId: "4",
    candidateName: "Stephanie Rodriguez",
    candidateJobTitle: "Social Media Manager",
    roundId: "4",
    roundName: "Manager Interview",
    interviewType: "Phone Interview",
    scheduledDate: "2026-03-02",
    scheduledTime: "14:30",
    durationMinutes: 120,
    location: "Conference Room B",
    meetingLink: "",
    interviewers: [],
    status: "Completed",
    feedbackStatus: "Submitted",
    createdAt: "2026-02-01",
  },
  {
    id: "5",
    candidateId: "5",
    candidateName: "Brian Clark",
    candidateJobTitle: "Graphic Designer",
    roundId: "5",
    roundName: "Cultural Fit Assessment",
    interviewType: "Panel Interview",
    scheduledDate: "2026-02-16",
    scheduledTime: "09:30",
    durationMinutes: 75,
    location: "Online",
    meetingLink: "https://meet.example.com/brian",
    interviewers: [],
    status: "Scheduled",
    feedbackStatus: "Pending",
    createdAt: "2026-02-02",
  },
  {
    id: "6",
    candidateId: "6",
    candidateName: "Daniel Harris",
    candidateJobTitle: "Customer Success Manager",
    roundId: "5",
    roundName: "Cultural Fit Assessment",
    interviewType: "Phone Interview",
    scheduledDate: "2026-02-03",
    scheduledTime: "11:00",
    durationMinutes: 60,
    location: "Executive Conference Room",
    meetingLink: "",
    interviewers: [],
    status: "Cancelled",
    feedbackStatus: "Pending",
    createdAt: "2026-01-30",
  },
  {
    id: "7",
    candidateId: "7",
    candidateName: "Emily Davis",
    candidateJobTitle: "Data Engineer",
    roundId: "6",
    roundName: "Case Study",
    interviewType: "Behavioral Interview",
    scheduledDate: "2026-02-02",
    scheduledTime: "14:00",
    durationMinutes: 90,
    location: "Online",
    meetingLink: "https://meet.example.com/emily",
    interviewers: [],
    status: "Completed",
    feedbackStatus: "Submitted",
    createdAt: "2026-01-29",
  },
  {
    id: "8",
    candidateId: "8",
    candidateName: "Andrew Lewis",
    candidateJobTitle: "Data Scientist",
    roundId: "4",
    roundName: "Manager Interview",
    interviewType: "Final Interview",
    scheduledDate: "2026-02-04",
    scheduledTime: "14:00",
    durationMinutes: 45,
    location: "Conference Room C",
    meetingLink: "",
    interviewers: [],
    status: "Scheduled",
    feedbackStatus: "Pending",
    createdAt: "2026-02-01",
  },
  {
    id: "9",
    candidateId: "9",
    candidateName: "Lisa Anderson",
    candidateJobTitle: "HR Business Partner",
    roundId: "7",
    roundName: "HR Discussion",
    interviewType: "Video Interview",
    scheduledDate: "2026-02-07",
    scheduledTime: "09:30",
    durationMinutes: 120,
    location: "Online",
    meetingLink: "https://meet.example.com/lisa",
    interviewers: [],
    status: "Completed",
    feedbackStatus: "Submitted",
    createdAt: "2026-02-03",
  },
];

type SortField =
  | "candidateName"
  | "roundName"
  | "interviewType"
  | "scheduledDate"
  | "location"
  | "status"
  | "feedbackStatus";
type SortDir = "asc" | "desc";

// Helper to format date/time for display
const formatDateTime = (date: string, time: string, duration: number) => {
  return `${date} ${time} (${duration} min)`;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const Interviews: React.FC = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>(sampleInterviews);
  useEffect(() => {
    let alive = true;
    api.raw.get("/recruitment/interviews/all").then((res) => {
      const arr = toArray<any>(res.data);
      if (!alive || !arr.length) return;
      const rid = (v: any) => (v && typeof v === "object" ? String(v._id) : String(v ?? ""));
      const cand = (v: any) => (v && typeof v === "object" ? `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim() || v.name || "" : "");
      const nm = (v: any) => (v && typeof v === "object" ? (v.name ?? v.title ?? "") : "");
      setInterviews(arr.map((i: any) => ({
        id: String(i._id),
        candidateId: rid(i.candidate_id),
        candidateName: cand(i.candidate_id),
        candidateJobTitle: (i.candidate_id && typeof i.candidate_id === "object" ? i.candidate_id.current_position : "") || "",
        roundId: rid(i.round_id),
        roundName: nm(i.round_id),
        interviewType: nm(i.interview_type_id),
        scheduledDate: i.scheduled_date ? String(i.scheduled_date).slice(0, 10) : "",
        scheduledTime: i.scheduled_time ?? "",
        durationMinutes: Number(i.duration) || 0,
        location: i.location ?? "",
        meetingLink: i.meeting_link ?? "",
        interviewers: (i.interviewer_ids ?? []).map((u: any) => u?.name ?? u).filter(Boolean),
        status: i.status ?? "Scheduled",
        feedbackStatus: i.feedback_submitted ? "Submitted" : "Pending",
        createdAt: i.createdAt ? String(i.createdAt).slice(0, 10) : "",
      })) as Interview[]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("scheduledDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);

  // Form state for edit/create modal
  const [formData, setFormData] = useState({
    candidateId: "",
    roundId: "",
    interviewType: "Panel Interview" as InterviewType,
    scheduledDate: "",
    scheduledTime: "",
    durationMinutes: 60,
    location: "",
    meetingLink: "",
    interviewers: [] as string[],
    status: "Scheduled" as InterviewStatus,
  });

  // ─── Sorting & Filtering ───────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const filteredInterviews = useMemo(() => {
    let result = [...interviews];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.candidateName.toLowerCase().includes(q) ||
          i.roundName.toLowerCase().includes(q) ||
          i.interviewType.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All")
      result = result.filter((i) => i.status === statusFilter);
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
  }, [interviews, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredInterviews.length / perPage);
  const paginatedInterviews = filteredInterviews.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      candidateId: "",
      roundId: "",
      interviewType: "Panel Interview",
      scheduledDate: "",
      scheduledTime: "",
      durationMinutes: 60,
      location: "",
      meetingLink: "",
      interviewers: [],
      status: "Scheduled",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowEditModal(true); // reuse same modal for create
  };

  const openEditModal = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormData({
      candidateId: interview.candidateId,
      roundId: interview.roundId,
      interviewType: interview.interviewType,
      scheduledDate: interview.scheduledDate,
      scheduledTime: interview.scheduledTime,
      durationMinutes: interview.durationMinutes,
      location: interview.location,
      meetingLink: interview.meetingLink,
      interviewers: interview.interviewers,
      status: interview.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (interview: Interview) => {
    setSelectedInterview(interview);
    setShowViewModal(true);
  };

  const openDeleteModal = (interview: Interview) => {
    setSelectedInterview(interview);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    if (!formData.candidateId) {
      showToast("Please select a candidate", "info");
      return;
    }
    if (!formData.roundId) {
      showToast("Please select an interview round", "info");
      return;
    }
    if (!formData.scheduledDate) {
      showToast("Please select a scheduled date", "info");
      return;
    }
    if (!formData.scheduledTime) {
      showToast("Please select scheduled time", "info");
      return;
    }
    if (formData.durationMinutes <= 0) {
      showToast("Duration must be positive", "info");
      return;
    }

    const selectedCandidate = candidates.find(
      (c) => c.id === formData.candidateId,
    );
    const selectedRound = interviewRounds.find(
      (r) => r.id === formData.roundId,
    );

    if (isEditing && selectedInterview) {
      setInterviews((prev) =>
        prev.map((i) =>
          i.id === selectedInterview.id
            ? {
                ...i,
                candidateId: formData.candidateId,
                candidateName: selectedCandidate?.name || "",
                candidateJobTitle: selectedCandidate?.jobTitle || "",
                roundId: formData.roundId,
                roundName: selectedRound?.name || "",
                interviewType: formData.interviewType,
                scheduledDate: formData.scheduledDate,
                scheduledTime: formData.scheduledTime,
                durationMinutes: formData.durationMinutes,
                location: formData.location,
                meetingLink: formData.meetingLink,
                interviewers: formData.interviewers,
                status: formData.status,
              }
            : i,
        ),
      );
      showToast("Interview updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newId = (interviews.length + 1).toString();
      const newInterview: Interview = {
        id: newId,
        candidateId: formData.candidateId,
        candidateName: selectedCandidate?.name || "",
        candidateJobTitle: selectedCandidate?.jobTitle || "",
        roundId: formData.roundId,
        roundName: selectedRound?.name || "",
        interviewType: formData.interviewType,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        durationMinutes: formData.durationMinutes,
        location: formData.location,
        meetingLink: formData.meetingLink,
        interviewers: formData.interviewers,
        status: formData.status,
        feedbackStatus: "Pending",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setInterviews((prev) => [newInterview, ...prev]);
      showToast("Interview scheduled successfully!", "success");
      setShowEditModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedInterview) {
      setInterviews((prev) =>
        prev.filter((i) => i.id !== selectedInterview.id),
      );
      showToast("Interview deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedInterview(null);
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

  // ─── Helper to get status badge styling ────────────────────────────────────

  const getStatusBadge = (status: InterviewStatus) => {
    switch (status) {
      case "Scheduled":
        return "bg-blue-100 text-blue-700";
      case "Completed":
        return "bg-green-100 text-green-700";
      case "Cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getFeedbackBadge = (feedback: FeedbackStatus) => {
    return feedback === "Submitted"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";
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
            Interview Details
          </h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedInterview && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Candidate Information
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Full Name:</span>{" "}
                  {selectedInterview.candidateName}
                </div>
                <div>
                  <span className="text-gray-500">Applied Job:</span>{" "}
                  {selectedInterview.candidateJobTitle}
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{" "}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedInterview.status)}`}
                  >
                    {selectedInterview.status}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Schedule Information
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>{" "}
                  {selectedInterview.scheduledDate}
                </div>
                <div>
                  <span className="text-gray-500">Time & Duration:</span>{" "}
                  {selectedInterview.scheduledTime} (
                  {selectedInterview.durationMinutes} min)
                </div>
                <div>
                  <span className="text-gray-500">Location:</span>{" "}
                  {selectedInterview.location}
                </div>
                {selectedInterview.meetingLink && (
                  <div>
                    <span className="text-gray-500">Meeting Link:</span>{" "}
                    <a
                      href={selectedInterview.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Join
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Interview Details
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Round:</span>{" "}
                  {selectedInterview.roundName}
                </div>
                <div>
                  <span className="text-gray-500">Interview Type:</span>{" "}
                  {selectedInterview.interviewType}
                </div>
                <div>
                  <span className="text-gray-500">Feedback Status:</span>{" "}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getFeedbackBadge(selectedInterview.feedbackStatus)}`}
                  >
                    {selectedInterview.feedbackStatus}
                  </span>
                </div>
              </div>
            </div>
            {selectedInterview.interviewers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Interviewers
                </h3>
                <div className="text-sm text-gray-600">
                  {selectedInterview.interviewers.join(", ")}
                </div>
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
              if (selectedInterview) openEditModal(selectedInterview);
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
              {isEditing ? "Edit Interview" : "Schedule Interview"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update interview details"
                : "Schedule a new interview"}
            </p>
          </div>
          <button
            onClick={() => {
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
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.jobTitle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interview Round *
            </label>
            <select
              value={formData.roundId}
              onChange={(e) =>
                setFormData({ ...formData, roundId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select Round</option>
              {interviewRounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interview Type *
            </label>
            <select
              value={formData.interviewType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  interviewType: e.target.value as InterviewType,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Panel Interview">Panel Interview</option>
              <option value="In-Person Interview">In-Person Interview</option>
              <option value="Phone Interview">Phone Interview</option>
              <option value="Video Interview">Video Interview</option>
              <option value="Behavioral Interview">Behavioral Interview</option>
              <option value="Final Interview">Final Interview</option>
              <option value="Technical Assessment">Technical Assessment</option>
              <option value="Portfolio Review">Portfolio Review</option>
              <option value="Manager Interview">Manager Interview</option>
              <option value="Cultural Fit Assessment">
                Cultural Fit Assessment
              </option>
              <option value="Case Study">Case Study</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date *
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Time *
              </label>
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (Minutes) *
            </label>
            <input
              type="number"
              min="1"
              step="5"
              value={formData.durationMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  durationMinutes: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="e.g., Conference Room A, Online"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Link
            </label>
            <input
              type="url"
              value={formData.meetingLink}
              onChange={(e) =>
                setFormData({ ...formData, meetingLink: e.target.value })
              }
              placeholder="https://meet.example.com/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interviewers (comma separated)
            </label>
            <input
              type="text"
              value={formData.interviewers.join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  interviewers: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s),
                })
              }
              placeholder="John Doe, Jane Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as InterviewStatus,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
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
            {isEditing ? "Update" : "Schedule"}
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
            Delete Interview
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete the interview for{" "}
            <span className="font-semibold">
              {selectedInterview?.candidateName}
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
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
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
            <span className="text-gray-900 font-medium">Interviews</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>as English</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Interviews
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
                placeholder="Search Interviews..."
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
                      setStatusFilter("Scheduled");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Scheduled
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
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="candidateName" label="Candidate" />
                <SortHeader field="roundName" label="Round" />
                <SortHeader field="interviewType" label="Interview Type" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Date & Time
                </th>
                <SortHeader field="location" label="Location" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="feedbackStatus" label="Feedback" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedInterviews.map((interview) => (
                <tr
                  key={interview.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(interview)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {interview.candidateName}{" "}
                    <span className="text-xs text-gray-400">
                      ({interview.candidateJobTitle})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {interview.roundName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {interview.interviewType}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDateTime(
                      interview.scheduledDate,
                      interview.scheduledTime,
                      interview.durationMinutes,
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {interview.location}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(interview.status)}`}
                    >
                      {interview.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getFeedbackBadge(interview.feedbackStatus)}`}
                    >
                      {interview.feedbackStatus}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(interview)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(interview)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(interview)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedInterviews.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No interviews found.
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
            {filteredInterviews.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredInterviews.length)} of{" "}
            {filteredInterviews.length} results
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

      {showEditModal && CreateEditModal()}
      {showViewModal && ViewModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};

export default Interviews;
