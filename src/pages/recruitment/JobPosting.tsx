/**
 * File: src/pages/recruitment/JobPostings.tsx
 * Manage Job Postings – full CRUD with list view, view modal, and create/edit modal
 * Includes: search, pagination, sorting, filters, tags input, rich text placeholder
 * Design matches provided screenshots and existing component patterns
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  ListChecks,
  Users,
  Link,
  Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobType = "Full Time" | "Part Time" | "Contract" | "Internship" | "Remote";
type Priority = "Low" | "Medium" | "High";
type JobStatus = "Published" | "Draft" | "Closed";

interface Branch {
  id: string;
  name: string;
}

interface JobPosting {
  id: string;
  code: string;
  title: string;
  jobType: JobType;
  location: string;
  branchId: string;
  branchName: string;
  minSalary: number;
  maxSalary: number;
  status: JobStatus;
  deadline: string;
  // additional fields for form / details
  applicationUrl: string;
  numberOfPositions: number;
  priority: Priority;
  minExperience: number;
  maxExperience: number;
  isFeatured: boolean;
  needToAsk: {
    gender: boolean;
    dateOfBirth: boolean;
    country: boolean;
    profileImage: boolean;
    resume: boolean;
    coverLetter: boolean;
  };
  requiredSkills: string[];
  description: string;
  requirements: string;
  createdAt: string;
}

// ─── Sample Branches (matching HRM / JobLocations) ───────────────────────────

const branches: Branch[] = [
  { id: "1", name: "Main Office" },
  { id: "2", name: "Downtown Branch" },
  { id: "3", name: "North Branch" },
  { id: "4", name: "South Branch" },
  { id: "5", name: "East Branch" },
  { id: "6", name: "West Branch" },
  { id: "7", name: "Corporate Headquarters" },
  { id: "8", name: "Sales Office" },
];

// ─── Sample Data (based on first screenshot) ─────────────────────────────────

const generateJobCode = (id: string): string => {
  const num = parseInt(id) + 120260000;
  return `JP${num}`;
};

const sampleJobPostings: JobPosting[] = [
  {
    id: "1",
    code: "JP120260053",
    title: "Chief Technology Officer",
    jobType: "Full Time",
    location: "San Francisco Office",
    branchId: "6",
    branchName: "West Branch",
    minSalary: 180000,
    maxSalary: 250000,
    status: "Draft",
    deadline: "2025-11-13",
    applicationUrl: "http://dicki.biz/illum-aut-expedita-maxime-doloribus",
    numberOfPositions: 1,
    priority: "High",
    minExperience: 12,
    maxExperience: 20,
    isFeatured: true,
    needToAsk: {
      gender: true,
      dateOfBirth: true,
      country: true,
      profileImage: true,
      resume: true,
      coverLetter: true,
    },
    requiredSkills: [
      "Technology Leadership",
      "Strategic Planning",
      "Innovation",
      "Team Building",
    ],
    description: "Lead technology strategy and innovation.",
    requirements:
      "12+ years technology leadership\nStrategic technology planning",
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    code: "JP120260054",
    title: "Senior Financial Controller",
    jobType: "Full Time",
    location: "Remote Work - Europe",
    branchId: "1",
    branchName: "Main Office",
    minSalary: 95000,
    maxSalary: 130000,
    status: "Draft",
    deadline: "2025-12-03",
    applicationUrl: "https://example.com/apply/2",
    numberOfPositions: 1,
    priority: "Medium",
    minExperience: 8,
    maxExperience: 15,
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: true,
      profileImage: true,
      resume: true,
      coverLetter: false,
    },
    requiredSkills: [
      "Financial Analysis",
      "Accounting",
      "Budgeting",
      "Compliance",
    ],
    description: "Oversee financial operations and reporting.",
    requirements: "CPA required, 8+ years experience",
    createdAt: "2024-01-02",
  },
  {
    id: "3",
    code: "JP120260055",
    title: "Director of Operations",
    jobType: "Full Time",
    location: "San Francisco Office",
    branchId: "7",
    branchName: "Corporate Headquarters",
    minSalary: 110000,
    maxSalary: 145000,
    status: "Draft",
    deadline: "2025-12-18",
    applicationUrl: "https://example.com/apply/3",
    numberOfPositions: 1,
    priority: "High",
    minExperience: 10,
    maxExperience: 18,
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: false,
      profileImage: true,
      resume: true,
      coverLetter: true,
    },
    requiredSkills: [
      "Operations Management",
      "Process Improvement",
      "Leadership",
    ],
    description: "Streamline operational processes.",
    requirements: "10+ years in operations",
    createdAt: "2024-01-03",
  },
  {
    id: "4",
    code: "JP120260029",
    title: "Database Administrator",
    jobType: "Full Time",
    location: "Austin Tech Hub",
    branchId: "5",
    branchName: "East Branch",
    minSalary: 75000,
    maxSalary: 105000,
    status: "Published",
    deadline: "2026-04-02",
    applicationUrl: "https://example.com/apply/4",
    numberOfPositions: 2,
    priority: "Medium",
    minExperience: 3,
    maxExperience: 7,
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: true,
      profileImage: true,
      resume: true,
      coverLetter: false,
    },
    requiredSkills: ["SQL", "Database Optimization", "Backup & Recovery"],
    description: "Manage and optimize database systems.",
    requirements: "3+ years DBA experience",
    createdAt: "2024-01-04",
  },
  {
    id: "5",
    code: "JP120260028",
    title: "Content Strategist",
    jobType: "Full Time",
    location: "Berlin Office",
    branchId: "4",
    branchName: "South Branch",
    minSalary: 55000,
    maxSalary: 75000,
    status: "Published",
    deadline: "2026-03-23",
    applicationUrl: "https://example.com/apply/5",
    numberOfPositions: 1,
    priority: "Low",
    minExperience: 2,
    maxExperience: 5,
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: false,
      profileImage: true,
      resume: true,
      coverLetter: true,
    },
    requiredSkills: ["Content Writing", "SEO", "Social Media"],
    description: "Develop content strategy.",
    requirements: "Portfolio required",
    createdAt: "2024-01-05",
  },
  {
    id: "6",
    code: "JP120260027",
    title: "Network Administrator",
    jobType: "Full Time",
    location: "London Office",
    branchId: "6",
    branchName: "West Branch",
    minSalary: 60000,
    maxSalary: 85000,
    status: "Published",
    deadline: "2026-03-18",
    applicationUrl: "https://example.com/apply/6",
    numberOfPositions: 1,
    priority: "Medium",
    minExperience: 3,
    maxExperience: 6,
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: true,
      profileImage: true,
      resume: true,
      coverLetter: false,
    },
    requiredSkills: ["Cisco", "Firewalls", "Network Security"],
    description: "Maintain network infrastructure.",
    requirements: "CCNA preferred",
    createdAt: "2024-01-06",
  },
  {
    id: "7",
    code: "JP120260026",
    title: "Sales Manager",
    jobType: "Full Time",
    location: "Dubai Office",
    branchId: "8",
    branchName: "Sales Office",
    minSalary: 65000,
    maxSalary: 95000,
    status: "Published",
    deadline: "2026-03-13",
    applicationUrl: "https://example.com/apply/7",
    numberOfPositions: 2,
    priority: "High",
    minExperience: 5,
    maxExperience: 10,
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: true,
      profileImage: true,
      resume: true,
      coverLetter: true,
    },
    requiredSkills: ["Sales Strategy", "Team Management", "CRM"],
    description: "Lead sales team to achieve targets.",
    requirements: "Proven sales track record",
    createdAt: "2024-01-07",
  },
  {
    id: "8",
    code: "JP120260025",
    title: "Product Designer",
    jobType: "Full Time",
    location: "Sydney Office",
    branchId: "1",
    branchName: "Main Office",
    minSalary: 70000,
    maxSalary: 95000,
    status: "Published",
    deadline: "2026-03-28",
    applicationUrl: "https://example.com/apply/8",
    numberOfPositions: 1,
    priority: "Medium",
    minExperience: 3,
    maxExperience: 7,
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: false,
      profileImage: true,
      resume: true,
      coverLetter: true,
    },
    requiredSkills: ["UI/UX", "Figma", "Prototyping"],
    description: "Design user-centered products.",
    requirements: "Portfolio required",
    createdAt: "2024-01-08",
  },
  {
    id: "9",
    code: "JP120260024",
    title: "Financial Analyst",
    jobType: "Full Time",
    location: "Berlin Office",
    branchId: "7",
    branchName: "Corporate Headquarters",
    minSalary: 55000,
    maxSalary: 80000,
    status: "Published",
    deadline: "2026-03-08",
    applicationUrl: "https://example.com/apply/9",
    numberOfPositions: 2,
    priority: "Low",
    minExperience: 1,
    maxExperience: 4,
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: false,
      profileImage: true,
      resume: true,
      coverLetter: false,
    },
    requiredSkills: ["Excel", "Financial Modeling", "Reporting"],
    description: "Analyze financial data.",
    requirements: "Finance degree",
    createdAt: "2024-01-09",
  },
];

// Generate additional to reach 55 as shown in screenshot footer
for (let i = 10; i <= 55; i++) {
  const branch = branches[i % branches.length];
  sampleJobPostings.push({
    id: i.toString(),
    code: generateJobCode(i.toString()),
    title: `Job Posting ${i}`,
    jobType: i % 3 === 0 ? "Part Time" : "Full Time",
    location: `Location ${i}`,
    branchId: branch.id,
    branchName: branch.name,
    minSalary: 40000 + i * 1000,
    maxSalary: 60000 + i * 1000,
    status: i % 5 === 0 ? "Draft" : "Published",
    deadline: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    applicationUrl: `https://example.com/apply/${i}`,
    numberOfPositions: (i % 3) + 1,
    priority: i % 3 === 0 ? "Low" : i % 2 === 0 ? "Medium" : "High",
    minExperience: i % 10,
    maxExperience: (i % 10) + 5,
    isFeatured: i % 7 === 0,
    needToAsk: {
      gender: i % 2 === 0,
      dateOfBirth: i % 3 === 0,
      country: i % 4 === 0,
      profileImage: true,
      resume: true,
      coverLetter: i % 5 === 0,
    },
    requiredSkills: [`Skill ${i}`, `Skill ${i + 1}`],
    description: `Description for job ${i}`,
    requirements: `Requirements for job ${i}`,
    createdAt: "2024-01-01",
  });
}

type SortField =
  | "code"
  | "title"
  | "jobType"
  | "location"
  | "branchName"
  | "minSalary"
  | "status"
  | "deadline";
type SortDir = "asc" | "desc";

// ─── Helper Component: Simple Tags Input ────────────────────────────────────

const TagsInput: React.FC<{
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = "Add skill and press Enter..." }) => {
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
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="border border-gray-300 rounded-md p-2 focus-within:ring-2 focus-within:ring-blue-500">
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-blue-900"
            >
              <X className="w-3 h-3" />
            </button>
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

export const JobPostings: React.FC = () => {
  const navigate = useNavigate();
  const [jobPostings, setJobPostings] =
    useState<JobPosting[]>(sampleJobPostings);
  useEffect(() => {
    let alive = true;
    api.raw.get("/recruitment/job-postings/all").then((res) => {
      const arr = toArray<any>(res.data);
      if (!alive || !arr.length) return;
      const rid = (v: any) => (v && typeof v === "object" ? String(v._id) : String(v ?? ""));
      const nm = (v: any) => (v && typeof v === "object" ? (v.name ?? v.title ?? "") : "");
      const ja = (o: any) => (o && typeof o === "object" ? o : {});
      setJobPostings(arr.map((j: any) => {
        const app = ja(j.job_application);
        return {
          id: String(j._id),
          code: j.code ?? j.posting_code ?? "",
          title: j.title ?? "",
          jobType: nm(j.job_type_id),
          location: nm(j.location_id),
          branchId: rid(j.branch_id),
          branchName: nm(j.branch_id),
          minSalary: Number(j.min_salary) || 0,
          maxSalary: Number(j.max_salary) || 0,
          status: j.status ?? "Active",
          deadline: j.deadline ? String(j.deadline).slice(0, 10) : "",
          applicationUrl: j.application_url ?? "",
          numberOfPositions: Number(j.number_of_positions ?? j.position) || 1,
          priority: j.priority ?? "Medium",
          minExperience: Number(j.min_experience) || 0,
          maxExperience: Number(j.max_experience) || 0,
          isFeatured: !!j.is_featured,
          needToAsk: {
            gender: !!app.gender,
            dateOfBirth: !!app.date_of_birth,
            country: !!app.country,
            profileImage: !!app.profile_image,
            resume: !!app.resume,
            coverLetter: !!app.cover_letter,
          },
          requiredSkills: Array.isArray(j.required_skills) ? j.required_skills : [],
          description: j.description ?? "",
          requirements: j.requirements ?? "",
          createdAt: j.createdAt ? String(j.createdAt).slice(0, 10) : "",
        };
      }) as JobPosting[]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state – full fields from screenshots
  const [formData, setFormData] = useState({
    title: "",
    jobType: "Full Time" as JobType,
    location: "",
    branchId: "",
    applicationUrl: "",
    numberOfPositions: 1,
    priority: "Medium" as Priority,
    minExperience: 0,
    maxExperience: 0,
    minSalary: 0,
    maxSalary: 0,
    deadline: "",
    isFeatured: false,
    needToAsk: {
      gender: false,
      dateOfBirth: false,
      country: false,
      profileImage: true,
      resume: true,
      coverLetter: false,
    },
    requiredSkills: [] as string[],
    description: "",
    requirements: "",
    status: "Draft" as JobStatus,
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

  const filteredJobs = useMemo(() => {
    let result = [...jobPostings];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.code.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All")
      result = result.filter((j) => j.status === statusFilter);
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "minSalary") {
        aVal = a.minSalary;
        bVal = b.minSalary;
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [jobPostings, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredJobs.length / perPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      title: "",
      jobType: "Full Time",
      location: "",
      branchId: "",
      applicationUrl: "https://demo.workdo.io/erpgo/company/careers",
      numberOfPositions: 1,
      priority: "Medium",
      minExperience: 0,
      maxExperience: 0,
      minSalary: 0,
      maxSalary: 0,
      deadline: "",
      isFeatured: false,
      needToAsk: {
        gender: false,
        dateOfBirth: false,
        country: false,
        profileImage: true,
        resume: true,
        coverLetter: false,
      },
      requiredSkills: [],
      description: "",
      requirements: "",
      status: "Draft",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (job: JobPosting) => {
    setSelectedJob(job);
    setFormData({
      title: job.title,
      jobType: job.jobType,
      location: job.location,
      branchId: job.branchId,
      applicationUrl: job.applicationUrl,
      numberOfPositions: job.numberOfPositions,
      priority: job.priority,
      minExperience: job.minExperience,
      maxExperience: job.maxExperience,
      minSalary: job.minSalary,
      maxSalary: job.maxSalary,
      deadline: job.deadline,
      isFeatured: job.isFeatured,
      needToAsk: { ...job.needToAsk },
      requiredSkills: [...job.requiredSkills],
      description: job.description,
      requirements: job.requirements,
      status: job.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (job: JobPosting) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const openDeleteModal = (job: JobPosting) => {
    setSelectedJob(job);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    // Validation
    if (!formData.title.trim()) {
      showToast("Title is required", "info");
      return;
    }
    if (!formData.location.trim()) {
      showToast("Location is required", "info");
      return;
    }
    if (!formData.branchId) {
      showToast("Branch is required", "info");
      return;
    }
    if (!formData.applicationUrl.trim()) {
      showToast("Application URL is required", "info");
      return;
    }
    if (formData.numberOfPositions < 1) {
      showToast("Number of positions must be at least 1", "info");
      return;
    }
    if (formData.minExperience < 0) {
      showToast("Minimum experience cannot be negative", "info");
      return;
    }
    if (formData.maxExperience < formData.minExperience) {
      showToast("Max experience must be ≥ min experience", "info");
      return;
    }
    if (formData.maxSalary < formData.minSalary) {
      showToast("Max salary must be ≥ min salary", "info");
      return;
    }
    if (!formData.deadline) {
      showToast("Application deadline is required", "info");
      return;
    }
    if (formData.requiredSkills.length === 0) {
      showToast("At least one required skill is needed", "info");
      return;
    }

    const selectedBranch = branches.find((b) => b.id === formData.branchId);
    if (!selectedBranch) return;

    if (isEditing && selectedJob) {
      setJobPostings((prev) =>
        prev.map((j) =>
          j.id === selectedJob.id
            ? {
                ...j,
                title: formData.title,
                jobType: formData.jobType,
                location: formData.location,
                branchId: formData.branchId,
                branchName: selectedBranch.name,
                applicationUrl: formData.applicationUrl,
                numberOfPositions: formData.numberOfPositions,
                priority: formData.priority,
                minExperience: formData.minExperience,
                maxExperience: formData.maxExperience,
                minSalary: formData.minSalary,
                maxSalary: formData.maxSalary,
                deadline: formData.deadline,
                isFeatured: formData.isFeatured,
                needToAsk: formData.needToAsk,
                requiredSkills: formData.requiredSkills,
                description: formData.description,
                requirements: formData.requirements,
                status: formData.status,
              }
            : j,
        ),
      );
      showToast("Job posting updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newId = (jobPostings.length + 1).toString();
      const newJob: JobPosting = {
        id: newId,
        code: generateJobCode(newId),
        title: formData.title,
        jobType: formData.jobType,
        location: formData.location,
        branchId: formData.branchId,
        branchName: selectedBranch.name,
        minSalary: formData.minSalary,
        maxSalary: formData.maxSalary,
        status: formData.status,
        deadline: formData.deadline,
        applicationUrl: formData.applicationUrl,
        numberOfPositions: formData.numberOfPositions,
        priority: formData.priority,
        minExperience: formData.minExperience,
        maxExperience: formData.maxExperience,
        isFeatured: formData.isFeatured,
        needToAsk: formData.needToAsk,
        requiredSkills: formData.requiredSkills,
        description: formData.description,
        requirements: formData.requirements,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setJobPostings((prev) => [newJob, ...prev]);
      showToast("Job posting created successfully!", "success");
      setShowCreateModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedJob) {
      setJobPostings((prev) => prev.filter((j) => j.id !== selectedJob.id));
      showToast("Job posting deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedJob(null);
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

  const ViewModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Job Posting Details
          </h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedJob && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedJob.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedJob.jobType} • {selectedJob.location}
                </p>
              </div>
              {selectedJob.isFeatured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                  <Star className="w-3 h-3" />
                  Featured
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Code:</span> {selectedJob.code}
              </div>
              <div>
                <span className="text-gray-500">Branch:</span>{" "}
                {selectedJob.branchName}
              </div>
              <div>
                <span className="text-gray-500">Salary Range:</span> $
                {selectedJob.minSalary.toLocaleString()} - $
                {selectedJob.maxSalary.toLocaleString()}
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${selectedJob.status === "Published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                >
                  {selectedJob.status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Positions:</span>{" "}
                {selectedJob.numberOfPositions}
              </div>
              <div>
                <span className="text-gray-500">Priority:</span>{" "}
                {selectedJob.priority}
              </div>
              <div>
                <span className="text-gray-500">Experience:</span>{" "}
                {selectedJob.minExperience} - {selectedJob.maxExperience} years
              </div>
              <div>
                <span className="text-gray-500">Deadline:</span>{" "}
                {selectedJob.deadline}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Job Description
              </h4>
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedJob.description}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Requirements</h4>
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedJob.requirements}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Required Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedJob.requiredSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Need to Ask</h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(selectedJob.needToAsk)
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <span key={k} className="capitalize text-sm text-gray-600">
                      {k.replace(/([A-Z])/g, " $1")}
                    </span>
                  ))}
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
              if (selectedJob) openEditModal(selectedJob);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );

  // Generic Create/Edit Modal (large form)
  const CreateEditModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Edit Job Posting" : "Create Job Posting"}
            </h2>
            <p className="text-sm text-gray-500">
              {isEditing ? "Update job details" : "Add a new job posting"}
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
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type *
              </label>
              <select
                value={formData.jobType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    jobType: e.target.value as JobType,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch *
              </label>
              <select
                value={formData.branchId}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Branch data comes from HRM add-on. Please ensure branches are
                created in HRM module first.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Application *
              </label>
              <input
                type="url"
                value={formData.applicationUrl}
                onChange={(e) =>
                  setFormData({ ...formData, applicationUrl: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Positions *
              </label>
              <input
                type="number"
                min="1"
                value={formData.numberOfPositions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    numberOfPositions: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as Priority,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Experience (Years) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.minExperience}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minExperience: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Experience (Years)
              </label>
              <input
                type="number"
                step="0.5"
                min={formData.minExperience}
                value={formData.maxExperience}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxExperience: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-red-500">
                {formData.maxExperience < formData.minExperience
                  ? "Must be ≥ min experience"
                  : ""}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Salary ($)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minSalary}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minSalary: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Salary ($)
              </label>
              <input
                type="number"
                min={formData.minSalary}
                value={formData.maxSalary}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxSalary: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-red-500">
                {formData.maxSalary < formData.minSalary
                  ? "Must be ≥ min salary"
                  : ""}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application Deadline *
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) =>
                    setFormData({ ...formData, isFeatured: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Featured Job</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Need to Ask?
            </label>
            <div className="flex flex-wrap gap-4">
              {[
                "gender",
                "dateOfBirth",
                "country",
                "profileImage",
                "resume",
                "coverLetter",
              ].map((field) => (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      formData.needToAsk[
                        field as keyof typeof formData.needToAsk
                      ]
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        needToAsk: {
                          ...formData.needToAsk,
                          [field]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="capitalize text-sm">
                    {field.replace(/([A-Z])/g, " $1")}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Skills *
            </label>
            <TagsInput
              value={formData.requiredSkills}
              onChange={(skills) =>
                setFormData({ ...formData, requiredSkills: skills })
              }
              placeholder="Add skill and press Enter..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Job description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requirements
            </label>
            <textarea
              rows={5}
              value={formData.requirements}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Job requirements..."
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
                  status: e.target.value as JobStatus,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Closed">Closed</option>
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
            Delete Job Posting
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedJob?.title}</span>? This
            action cannot be undone.
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
            <span className="text-gray-900 font-medium">Job Postings</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>ga English</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Job Postings
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
                placeholder="Search Job Postings..."
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
                      setStatusFilter("Published");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Published
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
                      setStatusFilter("Closed");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Closed
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
                <SortHeader field="code" label="Code" />
                <SortHeader field="title" label="Title" />
                <SortHeader field="jobType" label="Type" />
                <SortHeader field="location" label="Location" />
                <SortHeader field="branchName" label="Branch" />
                <SortHeader field="minSalary" label="Salary Range" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="deadline" label="Deadline" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedJobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(job)}
                >
                  <td className="px-4 py-3 font-mono text-gray-900">
                    {job.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {job.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{job.jobType}</td>
                  <td className="px-4 py-3 text-gray-600">{job.location}</td>
                  <td className="px-4 py-3 text-gray-600">{job.branchName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    ${job.minSalary.toLocaleString()} - $
                    {job.maxSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${job.status === "Published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                    >
                      {job.status === "Published" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : null}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{job.deadline}</td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(job)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(job)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(job)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No job postings found.缓解
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
            {filteredJobs.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to{" "}
            {Math.min(currentPage * perPage, filteredJobs.length)} of{" "}
            {filteredJobs.length} results
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

export default JobPostings;
