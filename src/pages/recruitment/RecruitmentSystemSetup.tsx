/**
 * File: src/pages/recruitment/RecruitmentSystemSetup.tsx
 * Recruitment System Setup – all modules: Job Types, Candidate Sources, Interview Types,
 * Onboarding Checklists, Brand Settings, About Company, Application Tips, What Happens Next,
 * Need Help, Tracking FAQ, Offer Letter Template
 * Design matches provided screenshots and existing HRM SystemSetup pattern
 */

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toArray } from "@/services/_http";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Globe,
  Briefcase,
  Users,
  PhoneCall,
  ClipboardList,
  Palette,
  Building2,
  Lightbulb,
  Clock,
  HelpCircle,
  FileQuestion,
  FileText,
  Save,
  Upload,
  Image,
  PlusCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobType {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface CandidateSource {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface InterviewType {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface OnboardingChecklist {
  id: string;
  name: string;
  items: number;
  isDefault: boolean;
  status: "Active" | "Inactive";
}

interface ApplicationTip {
  id: string;
  text: string;
}

interface WhatHappensStep {
  id: string;
  title: string;
  icon: string;
  description: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleJobTypes: JobType[] = [
  {
    id: "1",
    name: "Full Time",
    description:
      "Permanent employment with full benefits and standard working hours",
    isActive: true,
  },
  {
    id: "2",
    name: "Part Time",
    description:
      "Employment with reduced hours. Typically less than 30 hours per week",
    isActive: true,
  },
  {
    id: "3",
    name: "Contract",
    description: "Fixed-term employment for specific projects or duration",
    isActive: true,
  },
  {
    id: "4",
    name: "Freelance",
    description: "Independent contractor work on project basis",
    isActive: false,
  },
  {
    id: "5",
    name: "Remote",
    description: "Work from home or any location outside the office",
    isActive: true,
  },
  {
    id: "6",
    name: "Hybrid",
    description: "Combination of remote and office-based work",
    isActive: true,
  },
  {
    id: "7",
    name: "Internship",
    description:
      "Temporary position for students or recent graduates to gain experience",
    isActive: true,
  },
  {
    id: "8",
    name: "Temporary",
    description:
      "Short-term employment to cover specific needs or peak periods",
    isActive: false,
  },
];

const sampleCandidateSources: CandidateSource[] = [
  {
    id: "1",
    name: "LinkedIn",
    description: "Professional networking platform for recruiting candidates",
    isActive: true,
  },
  {
    id: "2",
    name: "Indeed",
    description:
      "Popular job board for posting positions and finding candidates",
    isActive: true,
  },
  {
    id: "3",
    name: "Employee Referral",
    description: "Candidates referred by current employees",
    isActive: true,
  },
  {
    id: "4",
    name: "Company Website",
    description: "Direct applications through company career page",
    isActive: true,
  },
  {
    id: "5",
    name: "Glassdoor",
    description: "Job board with company reviews and salary information",
    isActive: true,
  },
  {
    id: "6",
    name: "Monster",
    description: "Online job board and career platform",
    isActive: false,
  },
  {
    id: "7",
    name: "Recruitment Agency",
    description: "External recruitment firms and headhunters",
    isActive: true,
  },
  {
    id: "8",
    name: "University Campus",
    description: "Campus recruitment and job fairs at universities",
    isActive: true,
  },
  {
    id: "9",
    name: "Social Media",
    description: "Facebook, Twitter, Instagram job postings",
    isActive: false,
  },
  {
    id: "10",
    name: "Walk-in",
    description: "Candidates who apply directly at office location",
    isActive: false,
  },
];

const sampleInterviewTypes: InterviewType[] = [
  {
    id: "1",
    name: "Phone Interview",
    description: "Initial screening interview conducted over phone",
    isActive: true,
  },
  {
    id: "2",
    name: "Video Interview",
    description:
      "Remote interview using video conferencing tools like Zoom or Teams",
    isActive: true,
  },
  {
    id: "3",
    name: "In-Person Interview",
    description:
      "Face-to-face interview at company office or designated location",
    isActive: true,
  },
  {
    id: "4",
    name: "Panel Interview",
    description: "Interview conducted by multiple interviewers simultaneously",
    isActive: false,
  },
  {
    id: "5",
    name: "Technical Interview",
    description:
      "Assessment of technical skills and knowledge relevant to the role",
    isActive: true,
  },
  {
    id: "6",
    name: "Behavioral Interview",
    description: "Focus on past behavior and situational responses",
    isActive: true,
  },
  {
    id: "7",
    name: "Group Interview",
    description: "Multiple candidates interviewed together in group setting",
    isActive: false,
  },
  {
    id: "8",
    name: "Final Interview",
    description:
      "Last round interview typically with senior management or decision makers",
    isActive: true,
  },
];

const sampleOnboardingChecklists: OnboardingChecklist[] = [
  {
    id: "1",
    name: "IT Setup & Equipment",
    items: 4,
    isDefault: true,
    status: "Active",
  },
  {
    id: "2",
    name: "HR Documentation",
    items: 0,
    isDefault: true,
    status: "Active",
  },
  {
    id: "3",
    name: "Workspace Setup",
    items: 1,
    isDefault: true,
    status: "Active",
  },
  {
    id: "4",
    name: "Team Introduction",
    items: 2,
    isDefault: true,
    status: "Active",
  },
  {
    id: "5",
    name: "Company Orientation",
    items: 0,
    isDefault: true,
    status: "Active",
  },
  {
    id: "6",
    name: "Role-Specific Training",
    items: 1,
    isDefault: false,
    status: "Active",
  },
  {
    id: "7",
    name: "Security & Compliance",
    items: 1,
    isDefault: true,
    status: "Active",
  },
  {
    id: "8",
    name: "Benefits Enrollment",
    items: 1,
    isDefault: true,
    status: "Active",
  },
  {
    id: "9",
    name: "Payroll Setup",
    items: 4,
    isDefault: true,
    status: "Active",
  },
  {
    id: "10",
    name: "Manager Check-in",
    items: 3,
    isDefault: false,
    status: "Active",
  },
];

const sampleApplicationTips: ApplicationTip[] = [
  {
    id: "1",
    text: "Tailor your resume to match the job requirements and highlight relevant experience",
  },
  {
    id: "2",
    text: "Write a compelling cover letter that showcases your passion for the role",
  },
  { id: "3", text: "Research our company culture and values before applying" },
  {
    id: "4",
    text: "Ensure your LinkedIn profile is up-to-date and professional",
  },
  {
    id: "5",
    text: "Prepare specific examples of your achievements and problem-solving skills",
  },
];

const sampleWhatHappensSteps: WhatHappensStep[] = [
  {
    id: "1",
    title: "Application Review",
    icon: "Search",
    description:
      "Our HR team will carefully review your application and qualifications within 3-5 days.",
  },
  {
    id: "2",
    title: "Initial Screening",
    icon: "Phone",
    description:
      "Qualified candidates will receive a phone or video call for initial screening.",
  },
  {
    id: "3",
    title: "Final Interview",
    icon: "Users",
    description:
      "Top candidates meet with hiring managers for final assessment.",
  },
];

const sampleFAQItems: FAQItem[] = [
  {
    id: "1",
    question: "How can I track my application status?",
    answer:
      "Use your unique tracking ID provided in the confirmation email to check your application status on our careers page.",
  },
  {
    id: "2",
    question: "How long does the recruitment process take?",
    answer:
      "Our typical recruitment process takes 2-3 weeks from application submission to final decision, depending on the role.",
  },
  {
    id: "3",
    question: "What should I do if I forgot my tracking ID?",
    answer:
      "Contact our HR team at careers@workdo.io with your full name and email address used for the application.",
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

type ModuleType =
  | "jobTypes"
  | "candidateSources"
  | "interviewTypes"
  | "onboardingChecklists"
  | "brandSettings"
  | "aboutCompany"
  | "applicationTips"
  | "whatHappensNext"
  | "needHelp"
  | "trackingFAQ"
  | "offerLetterTemplate";

export const RecruitmentSystemSetup: React.FC = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<ModuleType>("jobTypes");

  // Data states for tables
  const [jobTypes, setJobTypes] = useState<JobType[]>(sampleJobTypes);
  const [candidateSources, setCandidateSources] = useState<CandidateSource[]>(
    sampleCandidateSources,
  );
  const [interviewTypes, setInterviewTypes] =
    useState<InterviewType[]>(sampleInterviewTypes);
  const [onboardingChecklists, setOnboardingChecklists] = useState<
    OnboardingChecklist[]
  >(sampleOnboardingChecklists);
  const [applicationTips, setApplicationTips] = useState<ApplicationTip[]>(
    sampleApplicationTips,
  );
  const [whatHappensSteps, setWhatHappensSteps] = useState<WhatHappensStep[]>(
    sampleWhatHappensSteps,
  );
  const [faqItems, setFaqItems] = useState<FAQItem[]>(sampleFAQItems);

  // Load real recruitment config lists from the backend.
  useEffect(() => {
    const simple = (raw: any) =>
      toArray<any>(raw).map((x: any) => ({
        id: String(x._id),
        name: x.name ?? "",
        description: x.description ?? "",
        isActive: x.is_active !== false,
      }));
    api.raw.get("/recruitment/job-types/all").then((r) => { const a = simple(r.data); if (a.length) setJobTypes(a as JobType[]); }).catch(() => {});
    api.raw.get("/recruitment/candidate-sources/all").then((r) => { const a = simple(r.data); if (a.length) setCandidateSources(a as CandidateSource[]); }).catch(() => {});
    api.raw.get("/recruitment/interview-types/all").then((r) => { const a = simple(r.data); if (a.length) setInterviewTypes(a as InterviewType[]); }).catch(() => {});
    api.raw.get("/recruitment/onboarding-checklists/all").then((r) => {
      const a = toArray<any>(r.data).map((x: any) => ({
        id: String(x._id),
        name: x.name ?? "",
        items: Number(x.items) || 0,
        isDefault: !!x.is_default,
        status: x.status === "Inactive" ? "Inactive" : "Active",
      }));
      if (a.length) setOnboardingChecklists(a as OnboardingChecklist[]);
    }).catch(() => {});
  }, []);

  // Form states for settings
  const [brandSettings, setBrandSettings] = useState({
    logo: "",
    favicon: "",
    titleText: "Join Our Amazing Team",
    footerText:
      "© 2026 WorkDo Technologies. All rights reserved. Building the future together.",
    cardTitle: "Talent Acquisition Hub",
    cardDescription:
      "Streamline your hiring process with our comprehensive recruitment management system. From job posting to candidate onboarding, manage your entire talent pipeline efficiently.",
  });
  const [aboutCompany, setAboutCompany] = useState({
    mission:
      "To empower businesses with innovative technology solutions and exceptional talent.",
    companySize: "500-1000 employees",
    industry: "Technology & Software Development",
  });
  const [needHelp, setNeedHelp] = useState({
    description:
      "Have questions about your application? Our HR team is here to help you succeed.",
    email: "careers@workdo.io",
    phone: "+917802984720",
  });
  const [offerLetterTemplate, setOfferLetterTemplate] =
    useState(`Dear {applicant_name},

{app_name} is excited to bring you on board as {job_title}.

We're just a few formalities away from getting down to work. Please take the time to review our formal offer. It includes important details about your compensation, benefits, and the terms and conditions of your anticipated employment with {app_name}.

{app_name} is offering a {job_type} position for you as {job_title}, reporting to [immediate manager/supervisor] starting on {start_date} at {workplace_location}. Expected hours of work are {days_of_week}.

In this position, {app_name} is offering to start you at a pay rate of {salary} per {salary_type}. You will be paid on {salary_duration} basis.

As part of your compensation, we're also offering [if applicable, you'll describe your bonus, profit sharing, commission structure, stock options, and compensation committee rules here].

As an employee of {app_name}, you will be eligible for briefly name benefits, such as health insurance, stock plan, dental insurance, etc.

Please indicate your agreement with these terms and accept this offer by signing and dating this agreement on or before {offer_expiration_date}.

Sincerely,
{app_name}`);

  // Modal states for CRUD
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalFormData, setModalFormData] = useState<any>({});

  // ─── Generic CRUD Helpers ───────────────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setModalFormData({ name: "", description: "", isActive: true });
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setIsEditing(true);
    setEditingId(item.id);
    setModalFormData({
      name: item.name,
      description: item.description,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleSaveTableItem = () => {
    if (!modalFormData.name?.trim()) {
      showToast("Please enter a name", "info");
      return;
    }
    const newItem = {
      id: editingId || Date.now().toString(),
      name: modalFormData.name.trim(),
      description: modalFormData.description.trim(),
      isActive: modalFormData.isActive,
    };
    const updateState = (prev: any[]) => {
      if (isEditing && editingId) {
        return prev.map((item) =>
          item.id === editingId ? { ...item, ...newItem } : item,
        );
      } else {
        return [newItem, ...prev];
      }
    };
    switch (activeModule) {
      case "jobTypes":
        setJobTypes(updateState);
        break;
      case "candidateSources":
        setCandidateSources(updateState);
        break;
      case "interviewTypes":
        setInterviewTypes(updateState);
        break;
      default:
        break;
    }
    showToast(
      `${modalFormData.name} ${isEditing ? "updated" : "created"} successfully!`,
      "success",
    );
    setShowModal(false);
  };

  const handleDelete = (id: string, name: string, type: ModuleType) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      switch (type) {
        case "jobTypes":
          setJobTypes((prev) => prev.filter((i) => i.id !== id));
          break;
        case "candidateSources":
          setCandidateSources((prev) => prev.filter((i) => i.id !== id));
          break;
        case "interviewTypes":
          setInterviewTypes((prev) => prev.filter((i) => i.id !== id));
          break;
        case "onboardingChecklists":
          setOnboardingChecklists((prev) => prev.filter((i) => i.id !== id));
          break;
        default:
          break;
      }
      showToast(`${name} deleted successfully!`, "success");
    }
  };

  const toggleActive = (
    id: string,
    type: ModuleType,
    currentActive: boolean,
  ) => {
    const newActive = !currentActive;
    switch (type) {
      case "jobTypes":
        setJobTypes((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isActive: newActive } : i)),
        );
        break;
      case "candidateSources":
        setCandidateSources((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isActive: newActive } : i)),
        );
        break;
      case "interviewTypes":
        setInterviewTypes((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isActive: newActive } : i)),
        );
        break;
      default:
        break;
    }
    showToast(`Status ${newActive ? "activated" : "deactivated"}`, "success");
  };

  // ─── Render Table (generic for simple tables) ───────────────────────────────

  const renderSimpleTable = (
    data: any[],
    type: ModuleType,
    onEdit: (item: any) => void,
    onDelete: (id: string, name: string) => void,
    onToggle: (id: string, current: boolean) => void,
  ) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50">
        <h3 className="font-semibold text-gray-900 capitalize">
          {type.replace(/([A-Z])/g, " $1").trim()}
        </h3>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-md">
                  {item.description}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggle(item.id, item.isActive)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {item.isActive ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {item.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id, item.name)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Modal ───────────────────────────────────────────────────────────────────

  const renderModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Edit" : "Create"}{" "}
              {activeModule
                .replace(/([A-Z])/g, " $1")
                .trim()
                .slice(0, -1)}
            </h2>
            <p className="text-sm text-gray-500">
              {isEditing ? "Update information" : "Add new entry"}
            </p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={modalFormData.name || ""}
              onChange={(e) =>
                setModalFormData({ ...modalFormData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={modalFormData.description || ""}
              onChange={(e) =>
                setModalFormData({
                  ...modalFormData,
                  description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={modalFormData.isActive || false}
              onChange={(e) =>
                setModalFormData({
                  ...modalFormData,
                  isActive: e.target.checked,
                })
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span>Is Active</span>
          </label>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => setShowModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTableItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isEditing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Render Module Content ──────────────────────────────────────────────────

  const renderModuleContent = () => {
    switch (activeModule) {
      case "jobTypes":
        return renderSimpleTable(
          jobTypes,
          "jobTypes",
          openEditModal,
          (id, name) => handleDelete(id, name, "jobTypes"),
          (id, current) => toggleActive(id, "jobTypes", current),
        );
      case "candidateSources":
        return renderSimpleTable(
          candidateSources,
          "candidateSources",
          openEditModal,
          (id, name) => handleDelete(id, name, "candidateSources"),
          (id, current) => toggleActive(id, "candidateSources", current),
        );
      case "interviewTypes":
        return renderSimpleTable(
          interviewTypes,
          "interviewTypes",
          openEditModal,
          (id, name) => handleDelete(id, name, "interviewTypes"),
          (id, current) => toggleActive(id, "interviewTypes", current),
        );
      case "onboardingChecklists":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                Onboarding Checklists
              </h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> Add Checklist
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Is Default
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {onboardingChecklists.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.items} items
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.isDefault ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}
                        >
                          {item.isDefault ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {item.status === "Active" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(
                                item.id,
                                item.name,
                                "onboardingChecklists",
                              )
                            }
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "brandSettings":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo
                </label>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 border border-gray-300 rounded-md text-sm flex items-center gap-1">
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                  <span className="text-xs text-gray-500">No file chosen</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Favicon
                </label>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 border border-gray-300 rounded-md text-sm flex items-center gap-1">
                    <Image className="w-4 h-4" /> Upload
                  </button>
                  <span className="text-xs text-gray-500">No file chosen</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title Text
              </label>
              <input
                type="text"
                value={brandSettings.titleText}
                onChange={(e) =>
                  setBrandSettings({
                    ...brandSettings,
                    titleText: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Footer Text
              </label>
              <input
                type="text"
                value={brandSettings.footerText}
                onChange={(e) =>
                  setBrandSettings({
                    ...brandSettings,
                    footerText: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Dashboard Welcome Card Settings
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                Configure the title and description for the dashboard welcome
                card
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Title
                  </label>
                  <input
                    type="text"
                    value={brandSettings.cardTitle}
                    onChange={(e) =>
                      setBrandSettings({
                        ...brandSettings,
                        cardTitle: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Description
                  </label>
                  <textarea
                    rows={3}
                    value={brandSettings.cardDescription}
                    onChange={(e) =>
                      setBrandSettings({
                        ...brandSettings,
                        cardDescription: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                showToast("Brand settings saved!", "success");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        );
      case "aboutCompany":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Our Mission
              </label>
              <textarea
                rows={3}
                value={aboutCompany.mission}
                onChange={(e) =>
                  setAboutCompany({ ...aboutCompany, mission: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size *
                </label>
                <select
                  value={aboutCompany.companySize}
                  onChange={(e) =>
                    setAboutCompany({
                      ...aboutCompany,
                      companySize: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  <option>500-1000 employees</option>
                  <option>1000-5000 employees</option>
                  <option>5000+ employees</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={aboutCompany.industry}
                  onChange={(e) =>
                    setAboutCompany({
                      ...aboutCompany,
                      industry: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              onClick={() => {
                showToast("About company saved!", "success");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        );
      case "applicationTips":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Application Tips</h3>
              <button
                onClick={() => {
                  const newTip = {
                    id: Date.now().toString(),
                    text: "New tip text here",
                  };
                  setApplicationTips([...applicationTips, newTip]);
                  showToast("Tip added", "success");
                }}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusCircle className="w-4 h-4" /> Add Tip
              </button>
            </div>
            {applicationTips.map((tip, idx) => (
              <div key={tip.id} className="border-b pb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tip {idx + 1} *
                </label>
                <textarea
                  rows={2}
                  value={tip.text}
                  onChange={(e) =>
                    setApplicationTips((prev) =>
                      prev.map((t) =>
                        t.id === tip.id ? { ...t, text: e.target.value } : t,
                      ),
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            ))}
            <button
              onClick={() => {
                showToast("Application tips saved!", "success");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        );
      case "whatHappensNext":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h3 className="font-semibold text-gray-900">
              What Happens Next Section
            </h3>
            {whatHappensSteps.map((step, idx) => (
              <div key={step.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <h4 className="font-medium">Step {idx + 1}</h4>
                  <button
                    onClick={() => {
                      if (confirm("Delete step?"))
                        setWhatHappensSteps((prev) =>
                          prev.filter((s) => s.id !== step.id),
                        );
                    }}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) =>
                      setWhatHappensSteps((prev) =>
                        prev.map((s) =>
                          s.id === step.id
                            ? { ...s, title: e.target.value }
                            : s,
                        ),
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <input
                    type="text"
                    value={step.icon}
                    onChange={(e) =>
                      setWhatHappensSteps((prev) =>
                        prev.map((s) =>
                          s.id === step.id ? { ...s, icon: e.target.value } : s,
                        ),
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={step.description}
                    onChange={(e) =>
                      setWhatHappensSteps((prev) =>
                        prev.map((s) =>
                          s.id === step.id
                            ? { ...s, description: e.target.value }
                            : s,
                        ),
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const newStep = {
                  id: Date.now().toString(),
                  title: "New Step",
                  icon: "Star",
                  description: "Step description",
                };
                setWhatHappensSteps([...whatHappensSteps, newStep]);
              }}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Step
            </button>
            <button
              onClick={() => {
                showToast("Steps saved!", "success");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        );
      case "needHelp":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                rows={3}
                value={needHelp.description}
                onChange={(e) =>
                  setNeedHelp({ ...needHelp, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {needHelp.description.length}/50
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={needHelp.email}
                onChange={(e) =>
                  setNeedHelp({ ...needHelp, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="text"
                value={needHelp.phone}
                onChange={(e) =>
                  setNeedHelp({ ...needHelp, phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={() => {
                showToast("Need help settings saved!", "success");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        );
      case "trackingFAQ":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h3 className="font-semibold text-gray-900">Tracking FAQ</h3>
            {faqItems.map((item, idx) => (
              <div key={item.id} className="border-b pb-4 space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Question {idx + 1}</span>
                  <button
                    onClick={() => {
                      if (confirm("Delete FAQ?"))
                        setFaqItems((prev) =>
                          prev.filter((f) => f.id !== item.id),
                        );
                    }}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question
                  </label>
                  <textarea
                    rows={2}
                    value={item.question}
                    onChange={(e) =>
                      setFaqItems((prev) =>
                        prev.map((f) =>
                          f.id === item.id
                            ? { ...f, question: e.target.value }
                            : f,
                        ),
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <div className="text-right text-xs text-gray-400">
                    {item.question.length}/100
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Answer
                  </label>
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(e) =>
                      setFaqItems((prev) =>
                        prev.map((f) =>
                          f.id === item.id
                            ? { ...f, answer: e.target.value }
                            : f,
                        ),
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <div className="text-right text-xs text-gray-400">
                    {item.answer.length}/300
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const newFaq = {
                  id: Date.now().toString(),
                  question: "New Question",
                  answer: "New Answer",
                };
                setFaqItems([...faqItems, newFaq]);
              }}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" /> Add FAQ
            </button>
            <button
              onClick={() => {
                showToast("FAQ saved!", "success");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        );
      case "offerLetterTemplate":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Placeholders</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-gray-50 p-3 rounded">
                <div>
                  <code>{"{applicant_name}"}</code> - Applicant Name
                </div>
                <div>
                  <code>{"{app_name}"}</code> - App Name
                </div>
                <div>
                  <code>{"{company_name}"}</code> - Company Name
                </div>
                <div>
                  <code>{"{job_title}"}</code> - Job Title
                </div>
                <div>
                  <code>{"{job_type}"}</code> - Job Type
                </div>
                <div>
                  <code>{"{start_date}"}</code> - Proposed Start Date
                </div>
                <div>
                  <code>{"{workplace_location}"}</code> - Working Location
                </div>
                <div>
                  <code>{"{days_of_week}"}</code> - Days Of Week
                </div>
                <div>
                  <code>{"{salary}"}</code> - Salary
                </div>
                <div>
                  <code>{"{salary_type}"}</code> - Salary Type
                </div>
                <div>
                  <code>{"{salary_duration}"}</code> - Salary Duration
                </div>
                <div>
                  <code>{"{offer_expiration_date}"}</code> - Offer Expiration
                  Date
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Content
              </label>
              <textarea
                rows={15}
                value={offerLetterTemplate}
                onChange={(e) => setOfferLetterTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
            <button
              onClick={() => {
                showToast("Offer letter template saved!", "success");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Template
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // ─── Main Render ───────────────────────────────────────────────────────────

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
            <span className="text-gray-900 font-medium">System Setup</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>ga English</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              System Setup
            </h3>
            <nav className="space-y-1">
              {[
                { id: "jobTypes", label: "Job Types", icon: Briefcase },
                {
                  id: "candidateSources",
                  label: "Candidate Sources",
                  icon: Users,
                },
                {
                  id: "interviewTypes",
                  label: "Interview Types",
                  icon: PhoneCall,
                },
                {
                  id: "onboardingChecklists",
                  label: "Onboarding Checklists",
                  icon: ClipboardList,
                },
                { id: "brandSettings", label: "Brand Settings", icon: Palette },
                {
                  id: "aboutCompany",
                  label: "About Company Section",
                  icon: Building2,
                },
                {
                  id: "applicationTips",
                  label: "Application Tips Section",
                  icon: Lightbulb,
                },
                {
                  id: "whatHappensNext",
                  label: "What Happens Next Section",
                  icon: Clock,
                },
                {
                  id: "needHelp",
                  label: "Need Help Section",
                  icon: HelpCircle,
                },
                {
                  id: "trackingFAQ",
                  label: "Tracking FAQ",
                  icon: FileQuestion,
                },
                {
                  id: "offerLetterTemplate",
                  label: "Offer Letter Template",
                  icon: FileText,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id as ModuleType)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeModule === item.id ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="w-full">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">
              System Setup
            </h1>
            {renderModuleContent()}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && renderModal()}
    </div>
  );
};

export default RecruitmentSystemSetup;
