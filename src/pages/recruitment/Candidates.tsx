/**
 * File: src/pages/recruitment/Candidates.tsx
 * Manage Candidates – full CRUD with list view, view modal, and create/edit modal
 * Includes: search, pagination, sorting, filters, tags input, rich form fields
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
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Calendar,
  MapPin,
  Link,
  GraduationCap,
  Code,
  Building2,
  Award,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
}

interface Source {
  id: string;
  name: string;
}

type CandidateStatus = "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";

interface Candidate {
  id: string;
  trackingId: string;
  jobId: string;
  jobTitle: string;
  sourceId: string;
  sourceName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentCompany: string;
  currentPosition: string;
  experienceYears: number;
  currentSalary: number;
  expectedSalary: number;
  noticePeriod: string;
  applicationDate: string;
  skills: string[];
  education: string;
  portfolioUrl: string;
  linkedinUrl: string;
  status: CandidateStatus;
  createdAt: string;
}

// ─── Sample Data (based on screenshots) ───────────────────────────────────────

const jobs: Job[] = [
  { id: "1", title: "Chief Technology Officer" },
  { id: "2", title: "Senior Financial Controller" },
  { id: "3", title: "Director of Operations" },
  { id: "4", title: "Database Administrator" },
  { id: "5", title: "Content Strategist" },
  { id: "6", title: "Network Administrator" },
  { id: "7", title: "Sales Manager" },
  { id: "8", title: "Product Designer" },
  { id: "9", title: "Financial Analyst" },
  { id: "10", title: "Business Intelligence Analyst" },
  { id: "11", title: "Accounting Assistant" },
  { id: "12", title: "Data Scientist" },
  { id: "13", title: "Social Media Manager" },
  { id: "14", title: "Graphic Designer" },
  { id: "15", title: "Legal Operations Manager" },
  { id: "16", title: "Junior Frontend Developer" },
  { id: "17", title: "Business Analyst" },
  { id: "18", title: "Customer Success Manager" },
];

const sources: Source[] = [
  { id: "1", name: "Indeed" },
  { id: "2", name: "LinkedIn" },
  { id: "3", name: "Company Website" },
  { id: "4", name: "Glassdoor" },
  { id: "5", name: "Social Media" },
  { id: "6", name: "University Campus" },
  { id: "7", name: "Employee Referral" },
  { id: "8", name: "Job Fair" },
];

const generateTrackingId = (id: string): string => {
  const num = parseInt(id) + 120260010;
  return `TRK${num}`;
};

const sampleCandidates: Candidate[] = [
  {
    id: "11",
    trackingId: "TRK120260011",
    jobId: "10",
    jobTitle: "Business Intelligence Analyst",
    sourceId: "1",
    sourceName: "Indeed",
    firstName: "Christopher",
    lastName: "Jackson",
    email: "christopher.jackson@example.com",
    phone: "+19536960711",
    currentCompany: "DataCorp",
    currentPosition: "Data Analyst",
    experienceYears: 3,
    currentSalary: 55000,
    expectedSalary: 70000,
    noticePeriod: "2 weeks",
    applicationDate: "2026-01-03",
    skills: ["SQL", "Power BI", "Excel"],
    education: "Bachelor in Computer Science",
    portfolioUrl: "https://portfolio.example.com/christopher",
    linkedinUrl: "https://linkedin.com/in/christopher",
    status: "Screening",
    createdAt: "2026-01-03",
  },
  {
    id: "20",
    trackingId: "TRK120260020",
    jobId: "11",
    jobTitle: "Accounting Assistant",
    sourceId: "2",
    sourceName: "LinkedIn",
    firstName: "Megan",
    lastName: "Walker",
    email: "megan.walker@example.com",
    phone: "+19536960720",
    currentCompany: "Finance Inc",
    currentPosition: "Junior Accountant",
    experienceYears: 2,
    currentSalary: 45000,
    expectedSalary: 52000,
    noticePeriod: "1 month",
    applicationDate: "2026-01-10",
    skills: ["QuickBooks", "Excel", "Bookkeeping"],
    education: "Bachelor in Accounting",
    portfolioUrl: "",
    linkedinUrl: "https://linkedin.com/in/megan",
    status: "Screening",
    createdAt: "2026-01-10",
  },
  {
    id: "19",
    trackingId: "TRK120260019",
    jobId: "12",
    jobTitle: "Data Scientist",
    sourceId: "3",
    sourceName: "Company Website",
    firstName: "Andrew",
    lastName: "Lewis",
    email: "andrew.lewis@example.com",
    phone: "+19536960719",
    currentCompany: "AI Solutions",
    currentPosition: "Data Scientist",
    experienceYears: 4,
    currentSalary: 80000,
    expectedSalary: 105000,
    noticePeriod: "2 weeks",
    applicationDate: "2026-02-10",
    skills: ["Python", "Machine Learning", "SQL", "TensorFlow"],
    education: "Master in Data Science",
    portfolioUrl: "https://github.com/andrewlewis",
    linkedinUrl: "https://linkedin.com/in/andrew",
    status: "Screening",
    createdAt: "2026-02-10",
  },
  {
    id: "18",
    trackingId: "TRK120260018",
    jobId: "13",
    jobTitle: "Social Media Manager",
    sourceId: "4",
    sourceName: "Glassdoor",
    firstName: "Stephanie",
    lastName: "Rodriguez",
    email: "stephanie.rodriguez@example.com",
    phone: "+19536960712",
    currentCompany: "Dropbox",
    currentPosition: "Social Media Manager",
    experienceYears: 4,
    currentSalary: 65000,
    expectedSalary: 75000,
    noticePeriod: "Immediate",
    applicationDate: "2025-12-29",
    skills: ["Social Media Strategy", "Content Creation", "Analytics", "Adobe Suite"],
    education: "Bachelor in Marketing",
    portfolioUrl: "https://portfolio.example.com/stephanie",
    linkedinUrl: "https://linkedin.com/in/stephanie",
    status: "Hired",
    createdAt: "2025-12-29",
  },
  {
    id: "17",
    trackingId: "TRK120260017",
    jobId: "14",
    jobTitle: "Graphic Designer",
    sourceId: "5",
    sourceName: "Social Media",
    firstName: "Brian",
    lastName: "Clark",
    email: "brian.clark@example.com",
    phone: "+19536960717",
    currentCompany: "Creative Studio",
    currentPosition: "Graphic Designer",
    experienceYears: 3,
    currentSalary: 48000,
    expectedSalary: 60000,
    noticePeriod: "1 month",
    applicationDate: "2026-01-24",
    skills: ["Photoshop", "Illustrator", "Figma", "InDesign"],
    education: "Bachelor in Fine Arts",
    portfolioUrl: "https://brianclark.design",
    linkedinUrl: "https://linkedin.com/in/brianclark",
    status: "Offer",
    createdAt: "2026-01-24",
  },
  {
    id: "16",
    trackingId: "TRK120260016",
    jobId: "15",
    jobTitle: "Legal Operations Manager",
    sourceId: "6",
    sourceName: "University Campus",
    firstName: "Rachel",
    lastName: "Lee",
    email: "rachel.lee@example.com",
    phone: "+19536960716",
    currentCompany: "Legal Tech",
    currentPosition: "Legal Assistant",
    experienceYears: 5,
    currentSalary: 70000,
    expectedSalary: 90000,
    noticePeriod: "2 months",
    applicationDate: "2025-12-04",
    skills: ["Legal Research", "Contract Management", "Compliance"],
    education: "Juris Doctor",
    portfolioUrl: "",
    linkedinUrl: "https://linkedin.com/in/rachellee",
    status: "Offer",
    createdAt: "2025-12-04",
  },
  {
    id: "15",
    trackingId: "TRK120260015",
    jobId: "16",
    jobTitle: "Junior Frontend Developer",
    sourceId: "3",
    sourceName: "Company Website",
    firstName: "Kevin",
    lastName: "Thompson",
    email: "kevin.thompson@example.com",
    phone: "+19536960715",
    currentCompany: "Startup Hub",
    currentPosition: "Frontend Intern",
    experienceYears: 1,
    currentSalary: 35000,
    expectedSalary: 50000,
    noticePeriod: "2 weeks",
    applicationDate: "2026-02-08",
    skills: ["React", "JavaScript", "CSS", "HTML"],
    education: "Bootcamp Graduate",
    portfolioUrl: "https://kevin.dev",
    linkedinUrl: "https://linkedin.com/in/kevinthompson",
    status: "Interview",
    createdAt: "2026-02-08",
  },
  {
    id: "14",
    trackingId: "TRK120260014",
    jobId: "17",
    jobTitle: "Business Analyst",
    sourceId: "7",
    sourceName: "Employee Referral",
    firstName: "Nicole",
    lastName: "Martin",
    email: "nicole.martin@example.com",
    phone: "+19536960714",
    currentCompany: "Consulting Group",
    currentPosition: "Junior BA",
    experienceYears: 2,
    currentSalary: 52000,
    expectedSalary: 68000,
    noticePeriod: "1 month",
    applicationDate: "2025-12-12",
    skills: ["Requirements Gathering", "Agile", "JIRA", "SQL"],
    education: "Bachelor in Business Admin",
    portfolioUrl: "",
    linkedinUrl: "https://linkedin.com/in/nicolemartin",
    status: "Hired",
    createdAt: "2025-12-12",
  },
  {
    id: "13",
    trackingId: "TRK120260013",
    jobId: "18",
    jobTitle: "Customer Success Manager",
    sourceId: "4",
    sourceName: "Glassdoor",
    firstName: "Daniel",
    lastName: "Harris",
    email: "daniel.harris@example.com",
    phone: "+19536960713",
    currentCompany: "SaaS Corp",
    currentPosition: "CS Associate",
    experienceYears: 3,
    currentSalary: 50000,
    expectedSalary: 65000,
    noticePeriod: "2 weeks",
    applicationDate: "2026-01-14",
    skills: ["Customer Relations", "CRM", "Problem Solving", "Communication"],
    education: "Bachelor in Communications",
    portfolioUrl: "",
    linkedinUrl: "https://linkedin.com/in/danielharris",
    status: "Offer",
    createdAt: "2026-01-14",
  },
];

// Generate additional to reach 20 (as shown in screenshot footer)
for (let i = 10; i <= 20; i++) {
  if (sampleCandidates.length >= 20) break;
  const job = jobs[i % jobs.length];
  const source = sources[i % sources.length];
  sampleCandidates.push({
    id: (sampleCandidates.length + 1).toString(),
    trackingId: generateTrackingId((sampleCandidates.length + 1).toString()),
    jobId: job.id,
    jobTitle: job.title,
    sourceId: source.id,
    sourceName: source.name,
    firstName: `FirstName${i}`,
    lastName: `LastName${i}`,
    email: `candidate${i}@example.com`,
    phone: `+195369607${i}`,
    currentCompany: `Company ${i}`,
    currentPosition: `Position ${i}`,
    experienceYears: i % 10,
    currentSalary: 30000 + i * 1000,
    expectedSalary: 40000 + i * 1000,
    noticePeriod: i % 2 === 0 ? "Immediate" : "2 weeks",
    applicationDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    skills: [`Skill${i}`, `Skill${i+1}`],
    education: `Education ${i}`,
    portfolioUrl: `https://portfolio${i}.example.com`,
    linkedinUrl: `https://linkedin.com/in/candidate${i}`,
    status: i % 5 === 0 ? "Hired" : i % 3 === 0 ? "Interview" : i % 2 === 0 ? "Screening" : "Offer",
    createdAt: "2026-01-01",
  });
}

type SortField = "trackingId" | "firstName" | "email" | "jobTitle" | "sourceName" | "applicationDate" | "status";
type SortDir = "asc" | "desc";

// ─── Helper: Tags Input Component ────────────────────────────────────────────

const TagsInput: React.FC<{
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = "Enter skill and press Enter..." }) => {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div className="border border-gray-300 rounded-md p-2 focus-within:ring-2 focus-within:ring-blue-500">
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] outline-none text-sm"
        />
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const Candidates: React.FC = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>(sampleCandidates);
  // Load real candidates from the backend (falls back to samples on failure).
  useEffect(() => {
    let alive = true;
    api.raw
      .get("/recruitment/candidates/all")
      .then((res) => {
        const arr = toArray<any>(res.data);
        if (!alive || !arr.length) return;
        const rid = (v: any) => (v && typeof v === "object" ? String(v._id) : String(v ?? ""));
        const rname = (v: any, ...keys: string[]) =>
          v && typeof v === "object" ? (keys.map((k) => v[k]).find(Boolean) ?? "") : "";
        setCandidates(
          arr.map((c: any) => ({
            id: String(c._id),
            trackingId: c.tracking_id ?? "",
            jobId: rid(c.job_id),
            jobTitle: rname(c.job_id, "title", "job_title", "name"),
            sourceId: rid(c.source_id),
            sourceName: rname(c.source_id, "name", "title"),
            firstName: c.first_name ?? "",
            lastName: c.last_name ?? "",
            email: c.email ?? "",
            phone: c.phone ?? "",
            currentCompany: c.current_company ?? "",
            currentPosition: c.current_position ?? "",
            experienceYears: Number(c.experience_years) || 0,
            currentSalary: Number(c.current_salary) || 0,
            expectedSalary: Number(c.expected_salary) || 0,
            noticePeriod: c.notice_period ?? "",
            applicationDate: c.application_date ? String(c.application_date).slice(0, 10) : "",
            skills: Array.isArray(c.skills) ? c.skills : c.skills ? [c.skills] : [],
            education: c.education ?? "",
            portfolioUrl: c.portfolio_url ?? "",
            linkedinUrl: c.linkedin_url ?? "",
            status: (c.status ?? "New") as CandidateStatus,
            createdAt: c.createdAt ?? "",
          })) as Candidate[],
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("applicationDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state (all fields from screenshots)
  const [formData, setFormData] = useState({
    jobId: "",
    sourceId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    currentCompany: "",
    currentPosition: "",
    experienceYears: 0,
    currentSalary: 0,
    expectedSalary: 0,
    noticePeriod: "",
    applicationDate: "",
    skills: [] as string[],
    education: "",
    portfolioUrl: "",
    linkedinUrl: "",
    status: "Screening" as CandidateStatus,
  });

  // ─── Sorting & Filtering ───────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.trackingId.toLowerCase().includes(q) ||
        c.jobTitle.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") result = result.filter(c => c.status === statusFilter);
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "firstName") { aVal = `${a.firstName} ${a.lastName}`; bVal = `${b.firstName} ${b.lastName}`; }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [candidates, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredCandidates.length / perPage);
  const paginatedCandidates = filteredCandidates.slice((currentPage - 1) * perPage, currentPage * perPage);

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      jobId: "",
      sourceId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      currentCompany: "",
      currentPosition: "",
      experienceYears: 0,
      currentSalary: 0,
      expectedSalary: 0,
      noticePeriod: "",
      applicationDate: "",
      skills: [],
      education: "",
      portfolioUrl: "",
      linkedinUrl: "",
      status: "Screening",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setFormData({
      jobId: candidate.jobId,
      sourceId: candidate.sourceId,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      currentCompany: candidate.currentCompany,
      currentPosition: candidate.currentPosition,
      experienceYears: candidate.experienceYears,
      currentSalary: candidate.currentSalary,
      expectedSalary: candidate.expectedSalary,
      noticePeriod: candidate.noticePeriod,
      applicationDate: candidate.applicationDate,
      skills: [...candidate.skills],
      education: candidate.education,
      portfolioUrl: candidate.portfolioUrl,
      linkedinUrl: candidate.linkedinUrl,
      status: candidate.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowViewModal(true);
  };

  const openDeleteModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    // Validation
    if (!formData.jobId) { showToast("Please select a job", "info"); return; }
    if (!formData.sourceId) { showToast("Please select a source", "info"); return; }
    if (!formData.firstName.trim()) { showToast("First name is required", "info"); return; }
    if (!formData.lastName.trim()) { showToast("Last name is required", "info"); return; }
    if (!formData.email.trim()) { showToast("Email is required", "info"); return; }
    if (!formData.applicationDate) { showToast("Application date is required", "info"); return; }
    if (formData.experienceYears < 0) { showToast("Experience cannot be negative", "info"); return; }

    const selectedJob = jobs.find(j => j.id === formData.jobId);
    const selectedSource = sources.find(s => s.id === formData.sourceId);

    if (isEditing && selectedCandidate) {
      setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? {
        ...c,
        jobId: formData.jobId,
        jobTitle: selectedJob?.title || "",
        sourceId: formData.sourceId,
        sourceName: selectedSource?.name || "",
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        currentCompany: formData.currentCompany.trim(),
        currentPosition: formData.currentPosition.trim(),
        experienceYears: formData.experienceYears,
        currentSalary: formData.currentSalary,
        expectedSalary: formData.expectedSalary,
        noticePeriod: formData.noticePeriod.trim(),
        applicationDate: formData.applicationDate,
        skills: formData.skills,
        education: formData.education.trim(),
        portfolioUrl: formData.portfolioUrl.trim(),
        linkedinUrl: formData.linkedinUrl.trim(),
        status: formData.status,
      } : c));
      showToast("Candidate updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newId = (candidates.length + 1).toString();
      const trackingId = generateTrackingId(newId);
      const newCandidate: Candidate = {
        id: newId,
        trackingId,
        jobId: formData.jobId,
        jobTitle: selectedJob?.title || "",
        sourceId: formData.sourceId,
        sourceName: selectedSource?.name || "",
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        currentCompany: formData.currentCompany.trim(),
        currentPosition: formData.currentPosition.trim(),
        experienceYears: formData.experienceYears,
        currentSalary: formData.currentSalary,
        expectedSalary: formData.expectedSalary,
        noticePeriod: formData.noticePeriod.trim(),
        applicationDate: formData.applicationDate,
        skills: formData.skills,
        education: formData.education.trim(),
        portfolioUrl: formData.portfolioUrl.trim(),
        linkedinUrl: formData.linkedinUrl.trim(),
        status: formData.status,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setCandidates(prev => [newCandidate, ...prev]);
      showToast("Candidate created successfully!", "success");
      setShowCreateModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedCandidate) {
      setCandidates(prev => prev.filter(c => c.id !== selectedCandidate.id));
      showToast("Candidate deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedCandidate(null);
    }
  };

  // ─── Sort Header ────────────────────────────────────────────────────────────

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-50 whitespace-nowrap" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-gray-900" : "text-gray-400"}`} /></div>
    </th>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  const ViewModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Candidate Details</h2>
          <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {selectedCandidate && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedCandidate.firstName} {selectedCandidate.lastName}</h3>
                <p className="text-sm text-gray-500">{selectedCandidate.jobTitle} • #{selectedCandidate.trackingId}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                selectedCandidate.status === "Hired" ? "bg-green-100 text-green-700" :
                selectedCandidate.status === "Offer" ? "bg-purple-100 text-purple-700" :
                selectedCandidate.status === "Interview" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              }`}>{selectedCandidate.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Email:</span> <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5"/>{selectedCandidate.email}</div></div>
              <div><span className="text-gray-500">Phone:</span> <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5"/>{selectedCandidate.phone || "—"}</div></div>
              <div><span className="text-gray-500">Current Company:</span> <div className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5"/>{selectedCandidate.currentCompany || "—"}</div></div>
              <div><span className="text-gray-500">Current Position:</span> <div className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5"/>{selectedCandidate.currentPosition || "—"}</div></div>
              <div><span className="text-gray-500">Experience:</span> {selectedCandidate.experienceYears} years</div>
              <div><span className="text-gray-500">Notice Period:</span> {selectedCandidate.noticePeriod || "—"}</div>
              <div><span className="text-gray-500">Current Salary:</span> ${selectedCandidate.currentSalary.toLocaleString()}</div>
              <div><span className="text-gray-500">Expected Salary:</span> ${selectedCandidate.expectedSalary.toLocaleString()}</div>
              <div><span className="text-gray-500">Application Date:</span> {selectedCandidate.applicationDate}</div>
              <div><span className="text-gray-500">Source:</span> {selectedCandidate.sourceName}</div>
              <div className="col-span-2"><span className="text-gray-500">Skills:</span> <div className="flex flex-wrap gap-1 mt-1">{selectedCandidate.skills.map(s => <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{s}</span>)}</div></div>
              {selectedCandidate.education && <div className="col-span-2"><span className="text-gray-500">Education:</span> {selectedCandidate.education}</div>}
              {selectedCandidate.portfolioUrl && <div><span className="text-gray-500">Portfolio:</span> <a href={selectedCandidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a></div>}
              {selectedCandidate.linkedinUrl && <div><span className="text-gray-500">LinkedIn:</span> <a href={selectedCandidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Profile</a></div>}
            </div>
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Close</button>
          <button onClick={() => { setShowViewModal(false); if (selectedCandidate) openEditModal(selectedCandidate); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Edit</button>
        </div>
      </div>
    </div>
  );

  const CreateEditModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div><h2 className="text-lg font-semibold text-gray-900">{isEditing ? "Edit Candidate" : "Create Candidate"}</h2><p className="text-sm text-gray-500">{isEditing ? "Update candidate information" : "Add a new candidate"}</p></div>
          <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Job *</label><select value={formData.jobId} onChange={e => setFormData({...formData, jobId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"><option value="">Select Job</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Source *</label><select value={formData.sourceId} onChange={e => setFormData({...formData, sourceId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"><option value="">Select Source</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="Enter First Name" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Enter Last Name" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Enter Email" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+[country code][phone number]" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label><input type="text" value={formData.currentCompany} onChange={e => setFormData({...formData, currentCompany: e.target.value})} placeholder="Enter Current Company" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Position</label><input type="text" value={formData.currentPosition} onChange={e => setFormData({...formData, currentPosition: e.target.value})} placeholder="Enter Current Position" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years) *</label><input type="number" step="0.5" min="0" value={formData.experienceYears} onChange={e => setFormData({...formData, experienceYears: parseFloat(e.target.value) || 0})} placeholder="Enter Experience in Years" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Salary ($)</label><input type="number" min="0" value={formData.currentSalary} onChange={e => setFormData({...formData, currentSalary: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary ($)</label><input type="number" min="0" value={formData.expectedSalary} onChange={e => setFormData({...formData, expectedSalary: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label><input type="text" value={formData.noticePeriod} onChange={e => setFormData({...formData, noticePeriod: e.target.value})} placeholder="Enter Notice Period" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Application Date *</label><input type="date" value={formData.applicationDate} onChange={e => setFormData({...formData, applicationDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Skills</label><TagsInput value={formData.skills} onChange={skills => setFormData({...formData, skills})} placeholder="Enter Skills and press Enter..." /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Education</label><input type="text" value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} placeholder="Enter Education" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Url</label><input type="url" value={formData.portfolioUrl} onChange={e => setFormData({...formData, portfolioUrl: e.target.value})} placeholder="Enter Portfolio Url" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Url</label><input type="url" value={formData.linkedinUrl} onChange={e => setFormData({...formData, linkedinUrl: e.target.value})} placeholder="Enter LinkedIn Url" className="w-full px-3 py-2 border border-gray-300 rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as CandidateStatus})} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"><option value="Screening">Screening</option><option value="Interview">Interview</option><option value="Offer">Offer</option><option value="Hired">Hired</option><option value="Rejected">Rejected</option></select></div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{isEditing ? "Update" : "Create"}</button>
        </div>
      </div>
    </div>
  );

  const DeleteModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-8 h-8 text-red-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Candidate</h3>
          <p className="text-gray-500 mb-6">Are you sure you want to delete <span className="font-semibold">{selectedCandidate?.firstName} {selectedCandidate?.lastName}</span>? This action cannot be undone.</p>
          <div className="flex gap-3"><button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button><button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button></div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button><span>›</span>
            <button onClick={() => navigate("/recruitment")} className="hover:text-gray-700">Recruitment</button><span>›</span>
            <span className="text-gray-900 font-medium">Candidates</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white"><Globe className="w-4 h-4" /><span>ga English</span></div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Candidates</h2>
          <button onClick={openCreateModal} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"><Plus className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search Candidates..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md" /></div>
            <button onClick={() => showToast("Search applied", "info")} className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">Search</button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"><option value={5}>5 per page</option><option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option></select>
            <div className="relative"><button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"><Filter className="w-4 h-4 text-gray-500" /><span>Filters</span><ChevronDown className="w-3.5 h-3.5 text-gray-400" /></button>
            {showFilters && (<div className="absolute right-0 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"><div className="px-3 pb-1.5 mb-1 border-b border-gray-100">Status</div>
              <button onClick={() => { setStatusFilter("All"); setCurrentPage(1); setShowFilters(false); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50">All</button>
              <button onClick={() => { setStatusFilter("Screening"); setCurrentPage(1); setShowFilters(false); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50">Screening</button>
              <button onClick={() => { setStatusFilter("Interview"); setCurrentPage(1); setShowFilters(false); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50">Interview</button>
              <button onClick={() => { setStatusFilter("Offer"); setCurrentPage(1); setShowFilters(false); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50">Offer</button>
              <button onClick={() => { setStatusFilter("Hired"); setCurrentPage(1); setShowFilters(false); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50">Hired</button>
              <button onClick={() => { setStatusFilter("Rejected"); setCurrentPage(1); setShowFilters(false); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50">Rejected</button>
              <button onClick={() => setShowFilters(false)} className="w-full px-3 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50">Apply</button>
            </div>)}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <SortHeader field="trackingId" label="Tracking ID" />
                <SortHeader field="firstName" label="Name" />
                <SortHeader field="email" label="Email" />
                <SortHeader field="jobTitle" label="Job" />
                <SortHeader field="sourceName" label="Source" />
                <SortHeader field="applicationDate" label="Application Date" />
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedCandidates.map(candidate => (
                <tr key={candidate.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openViewModal(candidate)}>
                  <td className="px-4 py-3 font-mono text-gray-900">{candidate.trackingId}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{candidate.firstName} {candidate.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{candidate.email}</td>
                  <td className="px-4 py-3 text-gray-600">{candidate.jobTitle}</td>
                  <td className="px-4 py-3 text-gray-600">{candidate.sourceName}</td>
                  <td className="px-4 py-3 text-gray-600">{candidate.applicationDate}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    candidate.status === "Hired" ? "bg-green-100 text-green-700" :
                    candidate.status === "Offer" ? "bg-purple-100 text-purple-700" :
                    candidate.status === "Interview" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{candidate.status}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2"><button onClick={() => openViewModal(candidate)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Eye className="w-4 h-4" /></button><button onClick={() => openEditModal(candidate)} className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"><Edit className="w-4 h-4" /></button><button onClick={() => openDeleteModal(candidate)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div>
                  </td>
                </tr>
              ))}
              {paginatedCandidates.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No candidates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-gray-500">Showing {filteredCandidates.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredCandidates.length)} of {filteredCandidates.length} results</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Previous</span></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNumber; if (totalPages <= 5) pageNumber = i + 1; else if (currentPage <= 3) pageNumber = i + 1; else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i; else pageNumber = currentPage - 2 + i;
              return (<button key={pageNumber} onClick={() => setCurrentPage(pageNumber)} className={`w-8 h-8 text-sm rounded-md flex items-center justify-center ${currentPage === pageNumber ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>{pageNumber}</button>);
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"><span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {(showCreateModal || showEditModal) && CreateEditModal()}
      {showViewModal && ViewModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};

export default Candidates;