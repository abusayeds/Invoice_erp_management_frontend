/**
 * File: src/pages/recruitment/Offers.tsx
 * Manage Offers – full CRUD with list view, view modal, and create/edit modal
 * Includes: search, pagination, sorting, filters, status badges
 * Design matches provided screenshots and existing component patterns
 */

import React, { useState, useMemo , useEffect} from "react";
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
  DollarSign,
  Gift,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle?: string;
  department?: string;
}

interface Department {
  id: string;
  name: string;
}

type OfferStatus =
  | "Draft"
  | "Sent"
  | "Negotiating"
  | "Accepted"
  | "Declined"
  | "Expired";
type ApprovalStatus = "Pending" | "Approved" | "Rejected";

interface Offer {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  position: string;
  departmentId: string;
  departmentName: string;
  salary: number;
  bonus: number;
  equity: string;
  startDate: string;
  expirationDate: string;
  offerDate: string;
  benefits: string;
  status: OfferStatus;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

// ─── Sample Data (based on screenshots) ───────────────────────────────────────

const candidates: Candidate[] = [
  {
    id: "1",
    name: "Amanda Thomas",
    email: "amanda.thomas@example.com",
    phone: "+1234567890",
    jobTitle: "System Administrator",
    department: "IT",
  },
  {
    id: "2",
    name: "Michael Brown",
    email: "michael.brown@example.com",
    phone: "+498686260438",
    jobTitle: "Marketing Director",
    department: "Marketing",
  },
  {
    id: "3",
    name: "Jessica Miller",
    email: "jessica.miller@example.com",
    phone: "+1234567892",
    jobTitle: "Junior Data Scientist",
    department: "Data Science",
  },
  {
    id: "4",
    name: "Amanda Thomas",
    email: "amanda.thomas2@example.com",
    phone: "+1234567893",
    jobTitle: "Financial Analyst",
    department: "Finance",
  },
  {
    id: "5",
    name: "Lisa Anderson",
    email: "lisa.anderson@example.com",
    phone: "+1234567894",
    jobTitle: "Senior DevOps Engineer",
    department: "Engineering",
  },
  {
    id: "6",
    name: "Emily Davis",
    email: "emily.davis@example.com",
    phone: "+1234567895",
    jobTitle: "Legal Operations Manager",
    department: "Legal",
  },
  {
    id: "7",
    name: "Christopher Jackson",
    email: "christopher.jackson@example.com",
    phone: "+1234567896",
    jobTitle: "Cloud Solutions Architect",
    department: "IT",
  },
  {
    id: "8",
    name: "Daniel Harris",
    email: "daniel.harris@example.com",
    phone: "+1234567897",
    jobTitle: "Graphic Designer",
    department: "Design",
  },
  {
    id: "9",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+1234567898",
    jobTitle: "Customer Success Manager",
    department: "Customer Success",
  },
];

const departments: Department[] = [
  { id: "1", name: "IT" },
  { id: "2", name: "Marketing" },
  { id: "3", name: "Data Science" },
  { id: "4", name: "Finance" },
  { id: "5", name: "Engineering" },
  { id: "6", name: "Legal" },
  { id: "7", name: "Design" },
  { id: "8", name: "Customer Success" },
  { id: "9", name: "Sales" },
];

const sampleOffers: Offer[] = [
  {
    id: "1",
    candidateId: "1",
    candidateName: "Amanda Thomas",
    candidateEmail: "amanda.thomas@example.com",
    candidatePhone: "+1234567890",
    position: "Marketing Manager",
    departmentId: "2",
    departmentName: "Marketing",
    salary: 112453.0,
    bonus: 0,
    equity: "",
    startDate: "2025-12-24",
    expirationDate: "2026-02-07",
    offerDate: "2025-12-22",
    benefits: "Medical benefits, 401k",
    status: "Expired",
    approvalStatus: "Pending",
    createdAt: "2025-12-22",
  },
  {
    id: "2",
    candidateId: "2",
    candidateName: "Michael Brown",
    candidateEmail: "michael.brown@example.com",
    candidatePhone: "+498686260438",
    position: "Sales Representative",
    departmentId: "9",
    departmentName: "Sales",
    salary: 70972.0,
    bonus: 0,
    equity: "",
    startDate: "2026-02-17",
    expirationDate: "2026-02-07",
    offerDate: "2025-12-28",
    benefits:
      "Medical benefits, life insurance, stock options, remote work flexibility",
    status: "Draft",
    approvalStatus: "Pending",
    createdAt: "2025-12-28",
  },
  {
    id: "3",
    candidateId: "3",
    candidateName: "Jessica Miller",
    candidateEmail: "jessica.miller@example.com",
    candidatePhone: "+1234567892",
    position: "Product Manager",
    departmentId: "3",
    departmentName: "Data Science",
    salary: 108944.0,
    bonus: 0,
    equity: "",
    startDate: "2026-02-03",
    expirationDate: "2026-02-12",
    offerDate: "2026-02-03",
    benefits: "",
    status: "Negotiating",
    approvalStatus: "Approved",
    createdAt: "2026-02-03",
  },
  {
    id: "4",
    candidateId: "4",
    candidateName: "Amanda Thomas",
    candidateEmail: "amanda.thomas2@example.com",
    candidatePhone: "+1234567893",
    position: "Backend Engineer",
    departmentId: "5",
    departmentName: "Engineering",
    salary: 103893.0,
    bonus: 0,
    equity: "",
    startDate: "2026-02-21",
    expirationDate: "2026-02-21",
    offerDate: "2026-02-04",
    benefits: "",
    status: "Sent",
    approvalStatus: "Pending",
    createdAt: "2026-02-04",
  },
  {
    id: "5",
    candidateId: "5",
    candidateName: "Lisa Anderson",
    candidateEmail: "lisa.anderson@example.com",
    candidatePhone: "+1234567894",
    position: "DevOps Engineer",
    departmentId: "5",
    departmentName: "Engineering",
    salary: 63665.0,
    bonus: 0,
    equity: "",
    startDate: "2026-01-27",
    expirationDate: "2026-01-28",
    offerDate: "2026-01-22",
    benefits: "",
    status: "Draft",
    approvalStatus: "Pending",
    createdAt: "2026-01-22",
  },
  {
    id: "6",
    candidateId: "6",
    candidateName: "Emily Davis",
    candidateEmail: "emily.davis@example.com",
    candidatePhone: "+1234567895",
    position: "HR Specialist",
    departmentId: "6",
    departmentName: "Legal",
    salary: 69640.0,
    bonus: 6970.0,
    equity: "",
    startDate: "2026-01-23",
    expirationDate: "2026-02-23",
    offerDate: "2025-12-29",
    benefits: "",
    status: "Accepted",
    approvalStatus: "Pending",
    createdAt: "2025-12-29",
  },
  {
    id: "7",
    candidateId: "7",
    candidateName: "Christopher Jackson",
    candidateEmail: "christopher.jackson@example.com",
    candidatePhone: "+1234567896",
    position: "DevOps Engineer",
    departmentId: "5",
    departmentName: "Engineering",
    salary: 53949.0,
    bonus: 0,
    equity: "",
    startDate: "2026-02-06",
    expirationDate: "2025-12-22",
    offerDate: "2025-12-18",
    benefits: "",
    status: "Declined",
    approvalStatus: "Pending",
    createdAt: "2025-12-18",
  },
  {
    id: "8",
    candidateId: "8",
    candidateName: "Daniel Harris",
    candidateEmail: "daniel.harris@example.com",
    candidatePhone: "+1234567897",
    position: "Marketing Manager",
    departmentId: "2",
    departmentName: "Marketing",
    salary: 50282.0,
    bonus: 6834.0,
    equity: "",
    startDate: "2026-03-10",
    expirationDate: "2026-02-24",
    offerDate: "2025-12-14",
    benefits: "",
    status: "Accepted",
    approvalStatus: "Pending",
    createdAt: "2025-12-14",
  },
  {
    id: "9",
    candidateId: "9",
    candidateName: "John Smith",
    candidateEmail: "john.smith@example.com",
    candidatePhone: "+1234567898",
    position: "Senior Software Engineer",
    departmentId: "5",
    departmentName: "Engineering",
    salary: 57684.0,
    bonus: 0,
    equity: "",
    startDate: "2025-12-18",
    expirationDate: "2026-01-30",
    offerDate: "2025-12-15",
    benefits: "",
    status: "Draft",
    approvalStatus: "Pending",
    createdAt: "2025-12-15",
  },
];

// Generate additional to reach 15+ results
for (let i = 10; i <= 15; i++) {
  const candidate = candidates[i % candidates.length];
  const dept = departments[i % departments.length];
  const statuses: OfferStatus[] = [
    "Draft",
    "Sent",
    "Negotiating",
    "Accepted",
    "Declined",
    "Expired",
  ];
  const approvalStatuses: ApprovalStatus[] = [
    "Pending",
    "Approved",
    "Rejected",
  ];
  sampleOffers.push({
    id: i.toString(),
    candidateId: candidate.id,
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    candidatePhone: candidate.phone,
    position: `Position ${i}`,
    departmentId: dept.id,
    departmentName: dept.name,
    salary: 50000 + i * 1000,
    bonus: i % 3 === 0 ? 5000 : 0,
    equity: i % 2 === 0 ? "0.5%" : "",
    startDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    expirationDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 10).padStart(2, "0")}`,
    offerDate: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    benefits: "Standard benefits package",
    status: statuses[i % statuses.length],
    approvalStatus: approvalStatuses[i % approvalStatuses.length],
    createdAt: "2025-01-01",
  });
}

type SortField =
  | "candidateName"
  | "position"
  | "salary"
  | "startDate"
  | "expirationDate"
  | "status"
  | "offerDate"
  | "approvalStatus";
type SortDir = "asc" | "desc";

// ─── Helper to format currency ───────────────────────────────────────────────

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// ─── Helper to get status badge styling ──────────────────────────────────────

const getStatusBadge = (status: OfferStatus) => {
  switch (status) {
    case "Draft":
      return "bg-gray-100 text-gray-700";
    case "Sent":
      return "bg-blue-100 text-blue-700";
    case "Negotiating":
      return "bg-yellow-100 text-yellow-700";
    case "Accepted":
      return "bg-green-100 text-green-700";
    case "Declined":
      return "bg-red-100 text-red-700";
    case "Expired":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getApprovalBadge = (status: ApprovalStatus) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-700";
    case "Approved":
      return "bg-green-100 text-green-700";
    case "Rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const Offers: React.FC = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>(sampleOffers);
  useEffect(() => {
    let alive = true;
    api.raw.get("/recruitment/offers/all").then((res) => {
      const arr = toArray<any>(res.data);
      if (!alive || !arr.length) return;
      const rid = (v: any) => (v && typeof v === "object" ? String(v._id) : String(v ?? ""));
      const cand = (v: any) => (v && typeof v === "object" ? `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim() || v.name || "" : "");
      const ymd = (v: any) => (v ? String(v).slice(0, 10) : "");
      setOffers(arr.map((o: any) => ({
        id: String(o._id),
        candidateId: rid(o.candidate_id),
        candidateName: cand(o.candidate_id),
        candidateEmail: (o.candidate_id && typeof o.candidate_id === "object" ? o.candidate_id.email : "") || "",
        candidatePhone: (o.candidate_id && typeof o.candidate_id === "object" ? o.candidate_id.phone : "") || "",
        position: o.position ?? "",
        departmentId: rid(o.department_id),
        departmentName: (o.department_id && typeof o.department_id === "object" ? o.department_id.name : "") || "",
        salary: Number(o.salary) || 0,
        bonus: Number(o.bonus) || 0,
        equity: o.equity ?? "",
        startDate: ymd(o.start_date),
        expirationDate: ymd(o.expiration_date),
        offerDate: ymd(o.offer_date),
        benefits: o.benefits ?? "",
        status: o.status ?? "Pending",
        approvalStatus: o.approval_status ?? "Pending",
        createdAt: ymd(o.createdAt),
      })) as Offer[]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("offerDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    candidateId: "",
    position: "",
    departmentId: "",
    salary: 0,
    bonus: 0,
    equity: "",
    startDate: "",
    expirationDate: "",
    benefits: "",
    status: "Draft" as OfferStatus,
  });

  // ─── Eligible candidates (only those who passed interview and are "qualified")
  // In a real app, this would come from an API. For demo, we'll simulate.
  const eligibleCandidates = useMemo(() => {
    // Simulate: candidates who have "Strong Hire" or "Hire" feedback
    const eligibleIds = ["1", "2", "3", "5", "6", "7", "8", "9"];
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

  const filteredOffers = useMemo(() => {
    let result = [...offers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.candidateName.toLowerCase().includes(q) ||
          o.position.toLowerCase().includes(q) ||
          o.departmentName.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All")
      result = result.filter((o) => o.status === statusFilter);
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "salary") aVal = a.salary;
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [offers, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredOffers.length / perPage);
  const paginatedOffers = filteredOffers.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      candidateId: "",
      position: "",
      departmentId: "",
      salary: 0,
      bonus: 0,
      equity: "",
      startDate: "",
      expirationDate: "",
      benefits: "",
      status: "Draft",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (offer: Offer) => {
    setSelectedOffer(offer);
    setFormData({
      candidateId: offer.candidateId,
      position: offer.position,
      departmentId: offer.departmentId,
      salary: offer.salary,
      bonus: offer.bonus,
      equity: offer.equity,
      startDate: offer.startDate,
      expirationDate: offer.expirationDate,
      benefits: offer.benefits,
      status: offer.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (offer: Offer) => {
    setSelectedOffer(offer);
    setShowViewModal(true);
  };

  const openDeleteModal = (offer: Offer) => {
    setSelectedOffer(offer);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    if (!formData.candidateId) {
      showToast("Please select a candidate", "info");
      return;
    }
    if (!formData.position.trim()) {
      showToast("Position is required", "info");
      return;
    }
    if (!formData.departmentId) {
      showToast("Please select a department", "info");
      return;
    }
    if (formData.salary <= 0) {
      showToast("Salary must be greater than zero", "info");
      return;
    }
    if (!formData.startDate) {
      showToast("Start date is required", "info");
      return;
    }
    if (!formData.expirationDate) {
      showToast("Expiration date is required", "info");
      return;
    }

    const selectedCandidate = eligibleCandidates.find(
      (c) => c.id === formData.candidateId,
    );
    const selectedDepartment = departments.find(
      (d) => d.id === formData.departmentId,
    );

    if (isEditing && selectedOffer) {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === selectedOffer.id
            ? {
                ...o,
                candidateId: formData.candidateId,
                candidateName: selectedCandidate?.name || "",
                candidateEmail: selectedCandidate?.email || "",
                candidatePhone: selectedCandidate?.phone || "",
                position: formData.position.trim(),
                departmentId: formData.departmentId,
                departmentName: selectedDepartment?.name || "",
                salary: formData.salary,
                bonus: formData.bonus,
                equity: formData.equity,
                startDate: formData.startDate,
                expirationDate: formData.expirationDate,
                benefits: formData.benefits,
                status: formData.status,
                offerDate: new Date().toISOString().split("T")[0],
              }
            : o,
        ),
      );
      showToast("Offer updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newId = (offers.length + 1).toString();
      const newOffer: Offer = {
        id: newId,
        candidateId: formData.candidateId,
        candidateName: selectedCandidate?.name || "",
        candidateEmail: selectedCandidate?.email || "",
        candidatePhone: selectedCandidate?.phone || "",
        position: formData.position.trim(),
        departmentId: formData.departmentId,
        departmentName: selectedDepartment?.name || "",
        salary: formData.salary,
        bonus: formData.bonus,
        equity: formData.equity,
        startDate: formData.startDate,
        expirationDate: formData.expirationDate,
        offerDate: new Date().toISOString().split("T")[0],
        benefits: formData.benefits,
        status: formData.status,
        approvalStatus: "Pending",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setOffers((prev) => [newOffer, ...prev]);
      showToast("Offer created successfully!", "success");
      setShowCreateModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedOffer) {
      setOffers((prev) => prev.filter((o) => o.id !== selectedOffer.id));
      showToast("Offer deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedOffer(null);
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
          <h2 className="text-lg font-semibold text-gray-900">Offer Details</h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedOffer && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Basic Information
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Candidate Name:</span>{" "}
                  {selectedOffer.candidateName}
                </div>
                <div>
                  <span className="text-gray-500">Position:</span>{" "}
                  {selectedOffer.position}
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  {selectedOffer.candidateEmail}
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>{" "}
                  {selectedOffer.candidatePhone}
                </div>
                <div>
                  <span className="text-gray-500">Job Title:</span>{" "}
                  {selectedOffer.position}
                </div>
                <div>
                  <span className="text-gray-500">Department:</span>{" "}
                  {selectedOffer.departmentName}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Compensation
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Salary:</span> $
                  {formatCurrency(selectedOffer.salary)}
                </div>
                {selectedOffer.bonus > 0 && (
                  <div>
                    <span className="text-gray-500">Bonus:</span> $
                    {formatCurrency(selectedOffer.bonus)}
                  </div>
                )}
                {selectedOffer.equity && (
                  <div>
                    <span className="text-gray-500">Equity:</span>{" "}
                    {selectedOffer.equity}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Important Dates
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Offer Date:</span>{" "}
                  {selectedOffer.offerDate}
                </div>
                <div>
                  <span className="text-gray-500">Start Date:</span>{" "}
                  {selectedOffer.startDate}
                </div>
                <div>
                  <span className="text-gray-500">Expires:</span>{" "}
                  {selectedOffer.expirationDate}{" "}
                  {new Date(selectedOffer.expirationDate) < new Date()
                    ? "(EXPIRED)"
                    : ""}
                </div>
              </div>
            </div>
            {selectedOffer.benefits && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Benefits
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedOffer.benefits}
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
              if (selectedOffer) openEditModal(selectedOffer);
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
              {isEditing ? "Edit Offer" : "Create Offer"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing ? "Update offer details" : "Create a new job offer"}
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
              Only qualified candidates are shown.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position *
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
              placeholder="Enter Position"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department *
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) =>
                setFormData({ ...formData, departmentId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salary ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.salary || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salary: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bonus ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.bonus || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bonus: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equity
            </label>
            <input
              type="text"
              value={formData.equity}
              onChange={(e) =>
                setFormData({ ...formData, equity: e.target.value })
              }
              placeholder="Enter Equity (e.g., 0.5%)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
                Expiration Date *
              </label>
              <input
                type="date"
                value={formData.expirationDate}
                onChange={(e) =>
                  setFormData({ ...formData, expirationDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Benefits
            </label>
            <textarea
              rows={2}
              value={formData.benefits}
              onChange={(e) =>
                setFormData({ ...formData, benefits: e.target.value })
              }
              placeholder="Enter Benefits"
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
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
                  status: e.target.value as OfferStatus,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Negotiating">Negotiating</option>
              <option value="Accepted">Accepted</option>
              <option value="Declined">Declined</option>
              <option value="Expired">Expired</option>
            </select>
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
            Delete Offer
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete the offer for{" "}
            <span className="font-semibold">
              {selectedOffer?.candidateName}
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
            <span className="text-gray-900 font-medium">Offers</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>GB English</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Offers</h2>
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
                placeholder="Search Offers..."
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
                      setStatusFilter("Draft");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Draft
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Sent");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Sent
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Negotiating");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Negotiating
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Accepted");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Accepted
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Declined");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Declined
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Expired");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Expired
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
                <SortHeader field="position" label="Position" />
                <SortHeader field="salary" label="Salary" />
                <SortHeader field="startDate" label="Start Date" />
                <SortHeader field="expirationDate" label="Expiration Date" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="offerDate" label="Offer Date" />
                <SortHeader field="approvalStatus" label="Approval Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedOffers.map((offer) => (
                <tr
                  key={offer.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(offer)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {offer.candidateName}
                    <br />
                    <span className="text-xs text-gray-400">
                      {offer.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{offer.position}</td>
                  <td className="px-4 py-3 text-gray-600">
                    ${formatCurrency(offer.salary)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{offer.startDate}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {offer.expirationDate}
                    {new Date(offer.expirationDate) < new Date()
                      ? " expire"
                      : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(offer.status)}`}
                    >
                      {offer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{offer.offerDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getApprovalBadge(offer.approvalStatus)}`}
                    >
                      {offer.approvalStatus}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(offer)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(offer)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(offer)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedOffers.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No offers found.缓解
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
            {filteredOffers.length === 0 ? 0 : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredOffers.length)} of{" "}
            {filteredOffers.length} results
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

export default Offers;
