/**
 * File: src/pages/recruitment/CandidateOnboarding.tsx
 * Manage Candidate Onboarding – full CRUD with list view, view modal, and create/edit modal
 * Includes: search, pagination, sorting, filters, status badges, buddy assignment
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
  Calendar,
  FileText,
  Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  name: string;
  email: string;
}

interface OnboardingChecklist {
  id: string;
  name: string;
}

interface BuddyEmployee {
  id: string;
  name: string;
}

interface CandidateOnboarding {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  checklistId: string;
  checklistName: string;
  startDate: string;
  buddyEmployeeId: string;
  buddyEmployeeName: string;
  status: "Not Started" | "In Progress" | "Completed";
  createdAt: string;
}

// ─── Sample Data (based on screenshots) ───────────────────────────────────────

const candidates: Candidate[] = [
  { id: "1", name: "Nicole Martin", email: "nicole.martin@example.com" },
  {
    id: "2",
    name: "Stephanie Rodriguez",
    email: "stephanie.rodriguez@example.com",
  },
  { id: "3", name: "Amanda Thomas", email: "amanda.thomas@example.com" },
  { id: "4", name: "Michael Brown", email: "michael.brown@example.com" },
  { id: "5", name: "Jessica Miller", email: "jessica.miller@example.com" },
];

const onboardingChecklists: OnboardingChecklist[] = [
  { id: "1", name: "HR Documentation" },
  { id: "2", name: "Performance Review Process" },
  { id: "3", name: "Company Handbook Review" },
  { id: "4", name: "Buddy System Assignment" },
  { id: "5", name: "Benefits Enrollment" },
  { id: "6", name: "Emergency Procedures" },
  { id: "7", name: "IT Setup & Equipment" },
  { id: "8", name: "Role-Specific Training" },
  { id: "9", name: "Company Orientation" },
];

const buddyEmployees: BuddyEmployee[] = [
  { id: "1", name: "James Garcia" },
  { id: "2", name: "John Smith" },
  { id: "3", name: "David Wilson" },
  { id: "4", name: "Mark Allen" },
  { id: "5", name: "Robert Taylor" },
  { id: "6", name: "Anthony Walker" },
];

const sampleOnboarding: CandidateOnboarding[] = [
  {
    id: "1",
    candidateId: "1",
    candidateName: "Nicole Martin",
    candidateEmail: "nicole.martin@example.com",
    checklistId: "1",
    checklistName: "HR Documentation",
    startDate: "2026-01-05",
    buddyEmployeeId: "1",
    buddyEmployeeName: "James Garcia",
    status: "Completed",
    createdAt: "2026-02-11",
  },
  {
    id: "2",
    candidateId: "1",
    candidateName: "Nicole Martin",
    candidateEmail: "nicole.martin@example.com",
    checklistId: "2",
    checklistName: "Performance Review Process",
    startDate: "2026-01-12",
    buddyEmployeeId: "2",
    buddyEmployeeName: "John Smith",
    status: "Completed",
    createdAt: "2026-02-11",
  },
  {
    id: "3",
    candidateId: "2",
    candidateName: "Stephanie Rodriguez",
    candidateEmail: "stephanie.rodriguez@example.com",
    checklistId: "3",
    checklistName: "Company Handbook Review",
    startDate: "2025-12-24",
    buddyEmployeeId: "3",
    buddyEmployeeName: "David Wilson",
    status: "Completed",
    createdAt: "2026-02-11",
  },
  {
    id: "4",
    candidateId: "2",
    candidateName: "Stephanie Rodriguez",
    candidateEmail: "stephanie.rodriguez@example.com",
    checklistId: "4",
    checklistName: "Buddy System Assignment",
    startDate: "2026-02-03",
    buddyEmployeeId: "2",
    buddyEmployeeName: "John Smith",
    status: "Completed",
    createdAt: "2026-02-11",
  },
  {
    id: "5",
    candidateId: "2",
    candidateName: "Stephanie Rodriguez",
    candidateEmail: "stephanie.rodriguez@example.com",
    checklistId: "5",
    checklistName: "Benefits Enrollment",
    startDate: "2026-01-16",
    buddyEmployeeId: "4",
    buddyEmployeeName: "Mark Allen",
    status: "Completed",
    createdAt: "2026-02-11",
  },
  {
    id: "6",
    candidateId: "3",
    candidateName: "Amanda Thomas",
    candidateEmail: "amanda.thomas@example.com",
    checklistId: "6",
    checklistName: "Emergency Procedures",
    startDate: "2026-01-05",
    buddyEmployeeId: "3",
    buddyEmployeeName: "David Wilson",
    status: "Completed",
    createdAt: "2026-02-11",
  },
  {
    id: "7",
    candidateId: "1",
    candidateName: "Nicole Martin",
    candidateEmail: "nicole.martin@example.com",
    checklistId: "7",
    checklistName: "IT Setup & Equipment",
    startDate: "2025-12-23",
    buddyEmployeeId: "5",
    buddyEmployeeName: "Robert Taylor",
    status: "Completed",
    createdAt: "2026-02-11",
  },
  {
    id: "8",
    candidateId: "3",
    candidateName: "Amanda Thomas",
    candidateEmail: "amanda.thomas@example.com",
    checklistId: "8",
    checklistName: "Role-Specific Training",
    startDate: "2025-12-16",
    buddyEmployeeId: "3",
    buddyEmployeeName: "David Wilson",
    status: "Completed",
    createdAt: "2026-02-11",
  },
  {
    id: "9",
    candidateId: "2",
    candidateName: "Stephanie Rodriguez",
    candidateEmail: "stephanie.rodriguez@example.com",
    checklistId: "9",
    checklistName: "Company Orientation",
    startDate: "2025-12-25",
    buddyEmployeeId: "6",
    buddyEmployeeName: "Anthony Walker",
    status: "Completed",
    createdAt: "2026-02-11",
  },
];

// Generate additional to reach 15 results
for (let i = 10; i <= 15; i++) {
  const candidate = candidates[i % candidates.length];
  const checklist = onboardingChecklists[i % onboardingChecklists.length];
  const buddy = buddyEmployees[i % buddyEmployees.length];
  sampleOnboarding.push({
    id: i.toString(),
    candidateId: candidate.id,
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    checklistId: checklist.id,
    checklistName: checklist.name,
    startDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    buddyEmployeeId: buddy.id,
    buddyEmployeeName: buddy.name,
    status:
      i % 3 === 0 ? "In Progress" : i % 4 === 0 ? "Not Started" : "Completed",
    createdAt: "2026-02-11",
  });
}

type SortField =
  | "candidateName"
  | "checklistName"
  | "startDate"
  | "buddyEmployeeName"
  | "status"
  | "createdAt";
type SortDir = "asc" | "desc";

// ─── Helper for status badge ─────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: CandidateOnboarding["status"] }> = ({
  status,
}) => {
  const config = {
    "Not Started": { bg: "bg-gray-100", text: "text-gray-700", icon: null },
    "In Progress": { bg: "bg-yellow-100", text: "text-yellow-700", icon: null },
    Completed: {
      bg: "bg-green-100",
      text: "text-green-700",
      icon: <CheckCircle className="w-3 h-3" />,
    },
  };
  const { bg, text, icon } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      {icon}
      {status}
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const CandidateOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [onboardingList, setOnboardingList] =
    useState<CandidateOnboarding[]>(sampleOnboarding);
  useEffect(() => {
    let alive = true;
    api.raw.get("/recruitment/candidate-onboardings/all").then((res) => {
      const arr = toArray<any>(res.data);
      if (!alive || !arr.length) return;
      const rid = (v: any) => (v && typeof v === "object" ? String(v._id) : String(v ?? ""));
      const cand = (v: any) => (v && typeof v === "object" ? `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim() || v.name || "" : "");
      const nm = (v: any) => (v && typeof v === "object" ? (v.name ?? v.title ?? "") : "");
      setOnboardingList(arr.map((o: any) => ({
        id: String(o._id),
        candidateId: rid(o.candidate_id),
        candidateName: cand(o.candidate_id),
        candidateEmail: (o.candidate_id && typeof o.candidate_id === "object" ? o.candidate_id.email : "") || "",
        checklistId: rid(o.checklist_id),
        checklistName: nm(o.checklist_id),
        startDate: o.start_date ? String(o.start_date).slice(0, 10) : "",
        buddyEmployeeId: rid(o.buddy_employee_id),
        buddyEmployeeName: nm(o.buddy_employee_id),
        status: o.status ?? "Not Started",
        createdAt: o.createdAt ? String(o.createdAt).slice(0, 10) : "",
      })) as CandidateOnboarding[]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] =
    useState<CandidateOnboarding | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    candidateId: "",
    checklistId: "",
    startDate: "",
    buddyEmployeeId: "",
    status: "Not Started" as CandidateOnboarding["status"],
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

  const filteredList = useMemo(() => {
    let result = [...onboardingList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.candidateName.toLowerCase().includes(q) ||
          o.checklistName.toLowerCase().includes(q) ||
          o.buddyEmployeeName.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All")
      result = result.filter((o) => o.status === statusFilter);
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
  }, [onboardingList, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredList.length / perPage);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      candidateId: "",
      checklistId: "",
      startDate: "",
      buddyEmployeeId: "",
      status: "Not Started",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (item: CandidateOnboarding) => {
    setSelectedOnboarding(item);
    setFormData({
      candidateId: item.candidateId,
      checklistId: item.checklistId,
      startDate: item.startDate,
      buddyEmployeeId: item.buddyEmployeeId,
      status: item.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (item: CandidateOnboarding) => {
    setSelectedOnboarding(item);
    setShowViewModal(true);
  };

  const openDeleteModal = (item: CandidateOnboarding) => {
    setSelectedOnboarding(item);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    if (!formData.candidateId) {
      showToast("Please select a candidate", "info");
      return;
    }
    if (!formData.checklistId) {
      showToast("Please select an onboarding checklist", "info");
      return;
    }
    if (!formData.startDate) {
      showToast("Start date is required", "info");
      return;
    }
    if (!formData.buddyEmployeeId) {
      showToast("Please select a buddy employee", "info");
      return;
    }

    const selectedCandidate = candidates.find(
      (c) => c.id === formData.candidateId,
    );
    const selectedChecklist = onboardingChecklists.find(
      (c) => c.id === formData.checklistId,
    );
    const selectedBuddy = buddyEmployees.find(
      (b) => b.id === formData.buddyEmployeeId,
    );

    if (isEditing && selectedOnboarding) {
      setOnboardingList((prev) =>
        prev.map((o) =>
          o.id === selectedOnboarding.id
            ? {
                ...o,
                candidateId: formData.candidateId,
                candidateName: selectedCandidate?.name || "",
                candidateEmail: selectedCandidate?.email || "",
                checklistId: formData.checklistId,
                checklistName: selectedChecklist?.name || "",
                startDate: formData.startDate,
                buddyEmployeeId: formData.buddyEmployeeId,
                buddyEmployeeName: selectedBuddy?.name || "",
                status: formData.status,
              }
            : o,
        ),
      );
      showToast("Onboarding record updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newId = (onboardingList.length + 1).toString();
      const newRecord: CandidateOnboarding = {
        id: newId,
        candidateId: formData.candidateId,
        candidateName: selectedCandidate?.name || "",
        candidateEmail: selectedCandidate?.email || "",
        checklistId: formData.checklistId,
        checklistName: selectedChecklist?.name || "",
        startDate: formData.startDate,
        buddyEmployeeId: formData.buddyEmployeeId,
        buddyEmployeeName: selectedBuddy?.name || "",
        status: formData.status,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setOnboardingList((prev) => [newRecord, ...prev]);
      showToast("Onboarding record created successfully!", "success");
      setShowCreateModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedOnboarding) {
      setOnboardingList((prev) =>
        prev.filter((o) => o.id !== selectedOnboarding.id),
      );
      showToast("Onboarding record deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedOnboarding(null);
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
            Candidate Onboarding Details
          </h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedOnboarding && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Candidate Information
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>{" "}
                  {selectedOnboarding.candidateName}
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  {selectedOnboarding.candidateEmail}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Onboarding Details
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Checklist Name:</span>{" "}
                  {selectedOnboarding.checklistName}
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{" "}
                  <StatusBadge status={selectedOnboarding.status} />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Timeline
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Start Date:</span>{" "}
                  {selectedOnboarding.startDate}
                </div>
                <div>
                  <span className="text-gray-500">Created At:</span>{" "}
                  {selectedOnboarding.createdAt}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Buddy Assignment
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Assigned Buddy:</span>{" "}
                  {selectedOnboarding.buddyEmployeeName}
                </div>
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
              if (selectedOnboarding) openEditModal(selectedOnboarding);
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
                ? "Edit Candidate Onboarding"
                : "Create Candidate Onboarding"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update onboarding details"
                : "Assign onboarding to candidate"}
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
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Onboarding Checklist *
            </label>
            <select
              value={formData.checklistId}
              onChange={(e) =>
                setFormData({ ...formData, checklistId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select Checklist</option>
              {onboardingChecklists.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buddy Employee *
            </label>
            <select
              value={formData.buddyEmployeeId}
              onChange={(e) =>
                setFormData({ ...formData, buddyEmployeeId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select Buddy Employee</option>
              {buddyEmployees.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Buddy employees are users with staff role.
            </p>
          </div>
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as CandidateOnboarding["status"],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          )}
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
            Delete Onboarding Record
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete onboarding for{" "}
            <span className="font-semibold">
              {selectedOnboarding?.candidateName}
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
              Candidate Onboarding
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>GB English</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Candidate Onboarding
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
                placeholder="Search Candidate Onboarding..."
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
                      setStatusFilter("Not Started");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Not Started
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("In Progress");
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
                <SortHeader field="checklistName" label="Checklist Name" />
                <SortHeader field="startDate" label="Start Date" />
                <SortHeader field="buddyEmployeeName" label="Buddy Name" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="createdAt" label="Created" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedList.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(record)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {record.candidateName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {record.candidateEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {record.checklistName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {record.startDate}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {record.buddyEmployeeName}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {record.createdAt}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(record)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(record)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(record)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedList.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No onboarding records found.缓解
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
            {filteredList.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to{" "}
            {Math.min(currentPage * perPage, filteredList.length)} of{" "}
            {filteredList.length} results
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

export default CandidateOnboarding;
