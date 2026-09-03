/**
 * File: src/pages/contracts/ManageContracts.tsx
 * Complete Contracts Module:
 *  1. ManageContracts  – list table with search, filters, list/grid toggle, pagination
 *                        Actions: copy(orange), pdf(purple), view(teal), edit(blue), delete(red)
 *  2. ContractPreview  – centered A4-style doc: title, Contract Info + Details 2-col,
 *                        Description, Signatures (cursive), Generated date, Back/Print/Download
 *  3. DetailsContract  – contract header card (status badge+dropdown, client, date, value, type pill)
 *                        5 tabs: Details | Attachments(3) | Comments(1) | Notes(3) | Renewals(2)
 *     - Details tab    – 3-col info grid, Description box (editable), Signatures side-by-side
 *     - Attachments    – list/grid toggle, upload btn, table: Preview icon|File Name|Uploaded By|Date|view/dl/delete
 *     - Comments       – Company compose box + sent comment cards with edit/delete
 *     - Notes          – green compose box + note cards with avatars + edit/delete
 *     - Renewals       – search + table: Start Date|End Date|Value|Status|Created By|view/edit/delete + pagination
 *  4. EditModal        – Subject*, Value*, Start Date*, End Date*, Status*, Contract Type*, Users*
 */

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { api } from "@/lib/api/client";
import { toArray } from "@/services/_http";
import { db } from "@/lib/db";
import {
  Globe,
  Plus,
  Search,
  List,
  Grid3X3,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
  Printer,
  Download,
  FileCheck,
  User,
  Calendar,
  DollarSign,
  Clock,
  Tag,
  Paperclip,
  MessageSquare,
  StickyNote,
  RefreshCw,
  Zap,
  X,
  Send,
  Upload,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractStatus = "Accepted" | "Pending" | "Closed" | "Declined" | "Draft";
type AppView = "list" | "details" | "preview";
type DetailsTab = "details" | "attachments" | "comments" | "notes" | "renewals";

interface Contract {
  id: number;
  number: string;
  subject: string;
  userName: string;
  value: number;
  type: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  createdDate: string;
  description: string;
  duration: number;
}

interface Attachment {
  id: number;
  fileName: string;
  uploadedBy: string;
  date: string;
}
interface Comment {
  id: number;
  author: string;
  avatar: string;
  date: string;
  text: string;
}
interface Note {
  id: number;
  author: string;
  avatar: string;
  date: string;
  text: string;
}
interface Renewal {
  id: number;
  startDate: string;
  endDate: string;
  value: number;
  status: string;
  createdBy: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleContracts: Contract[] = [
  {
    id: 1,
    number: "CON0020",
    subject: "Compliance Management System",
    userName: "Prime Services Co",
    value: 190000,
    type: "Data Processing Agreement",
    startDate: "2025-12-22",
    endDate: "2027-10-22",
    status: "Accepted",
    createdDate: "2025-12-07 12:33",
    description:
      "Regulatory compliance management platform with audit trails, policy management, risk assessment, and automated compliance reporting.",
    duration: 669,
  },
  {
    id: 2,
    number: "CON0019",
    subject: "Social Media Analytics Dashboard",
    userName: "Mark Allen",
    value: 75000,
    type: "Consulting Services Contract",
    startDate: "2025-12-05",
    endDate: "2026-08-05",
    status: "Accepted",
    createdDate: "2025-12-05 10:00",
    description:
      "Social media analytics platform for tracking engagement, reach, and conversion metrics across all major platforms.",
    duration: 243,
  },
  {
    id: 3,
    number: "CON0018",
    subject: "Manufacturing ERP Integration",
    userName: "Nicole Young",
    value: 240000,
    type: "Data Processing Agreement",
    startDate: "2025-12-08",
    endDate: "2027-12-08",
    status: "Pending",
    createdDate: "2025-12-08 09:00",
    description:
      "Full ERP integration for manufacturing operations including inventory, production, and supply chain management.",
    duration: 730,
  },
  {
    id: 4,
    number: "CON0017",
    subject: "Real Estate CRM & Portal",
    userName: "ABC Corporation",
    value: 155000,
    type: "Software Development Agreement",
    startDate: "2025-12-17",
    endDate: "2026-10-17",
    status: "Accepted",
    createdDate: "2025-12-17 11:00",
    description:
      "CRM and client portal for real estate agents with property listing management and client communication tools.",
    duration: 304,
  },
  {
    id: 5,
    number: "CON0016",
    subject: "Inventory Management Optimization",
    userName: "Amanda White",
    value: 98000,
    type: "Vendor Service Agreement",
    startDate: "2025-11-14",
    endDate: "2027-03-14",
    status: "Pending",
    createdDate: "2025-11-14 08:00",
    description:
      "Inventory optimization solution with real-time tracking, demand forecasting, and automated reorder management.",
    duration: 485,
  },
  {
    id: 6,
    number: "CON0015",
    subject: "Learning Management System",
    userName: "Jessica Harris",
    value: 135000,
    type: "Statement of Work (SOW)",
    startDate: "2025-11-21",
    endDate: "2026-08-21",
    status: "Closed",
    createdDate: "2025-11-21 14:00",
    description:
      "Enterprise LMS with course authoring, progress tracking, certification management, and reporting dashboards.",
    duration: 273,
  },
  {
    id: 7,
    number: "CON0014",
    subject: "Financial Trading Platform",
    userName: "James Garcia",
    value: 450000,
    type: "Consulting Services Contract",
    startDate: "2025-11-17",
    endDate: "2027-06-17",
    status: "Declined",
    createdDate: "2025-11-17 16:00",
    description:
      "High-frequency trading platform with real-time market data, algorithmic trading support, and risk management.",
    duration: 578,
  },
  {
    id: 8,
    number: "CON0013",
    subject: "Healthcare Management System",
    userName: "Tech Innovations Inc",
    value: 275000,
    type: "Digital Marketing Agreement",
    startDate: "2025-11-01",
    endDate: "2027-11-01",
    status: "Declined",
    createdDate: "2025-11-01 10:00",
    description:
      "Comprehensive healthcare management system with patient records, scheduling, billing, and compliance reporting.",
    duration: 730,
  },
  {
    id: 9,
    number: "CON0012",
    subject: "IoT Fleet Management Platform",
    userName: "Elite Enterprises",
    value: 180000,
    type: "Maintenance & Support Agreement",
    startDate: "2025-10-23",
    endDate: "2027-07-23",
    status: "Closed",
    createdDate: "2025-10-23 13:00",
    description:
      "IoT-based fleet management with real-time GPS tracking, predictive maintenance, and driver behavior analytics.",
    duration: 638,
  },
  {
    id: 10,
    number: "CON0011",
    subject: "Blockchain Supply Chain Solution",
    userName: "John Smith",
    value: 320000,
    type: "IT Services Contract",
    startDate: "2025-10-16",
    endDate: "2026-05-16",
    status: "Declined",
    createdDate: "2025-10-16 09:00",
    description:
      "Blockchain-based supply chain solution for end-to-end product traceability and smart contract automation.",
    duration: 212,
  },
  {
    id: 11,
    number: "CON0010",
    subject: "AI Customer Support Platform",
    userName: "Global Solutions",
    value: 210000,
    type: "Software Development Agreement",
    startDate: "2025-10-01",
    endDate: "2027-04-01",
    status: "Accepted",
    createdDate: "2025-10-01 11:00",
    description:
      "AI-powered customer support with NLP chatbots, sentiment analysis, and automated ticket resolution workflows.",
    duration: 547,
  },
  {
    id: 12,
    number: "CON0009",
    subject: "Cloud Migration Services",
    userName: "Dynamic Corp",
    value: 88000,
    type: "Consulting Services Contract",
    startDate: "2025-09-15",
    endDate: "2026-03-15",
    status: "Accepted",
    createdDate: "2025-09-15 10:00",
    description:
      "Full cloud migration from on-premise infrastructure to AWS with zero-downtime deployment and data integrity verification.",
    duration: 181,
  },
  {
    id: 13,
    number: "CON0008",
    subject: "Cybersecurity Audit & Hardening",
    userName: "Secure Systems Ltd",
    value: 62000,
    type: "Vendor Service Agreement",
    startDate: "2025-09-01",
    endDate: "2025-12-01",
    status: "Closed",
    createdDate: "2025-09-01 08:00",
    description:
      "Comprehensive cybersecurity audit including penetration testing, vulnerability assessment, and remediation.",
    duration: 91,
  },
  {
    id: 14,
    number: "CON0007",
    subject: "E-commerce Platform Rebuild",
    userName: "Retail Plus",
    value: 195000,
    type: "Software Development Agreement",
    startDate: "2025-08-20",
    endDate: "2026-08-20",
    status: "Accepted",
    createdDate: "2025-08-20 09:00",
    description:
      "Complete e-commerce platform rebuild with modern microservices architecture, PWA frontend, and AI recommendations.",
    duration: 365,
  },
  {
    id: 15,
    number: "CON0006",
    subject: "HR Payroll Integration",
    userName: "People First Inc",
    value: 45000,
    type: "IT Services Contract",
    startDate: "2025-08-01",
    endDate: "2025-12-31",
    status: "Closed",
    createdDate: "2025-08-01 10:00",
    description:
      "HR and payroll system integration with tax calculation, benefits management, and compliance reporting for 50 states.",
    duration: 152,
  },
  {
    id: 16,
    number: "CON0005",
    subject: "Mobile Banking Application",
    userName: "FinTech Solutions",
    value: 380000,
    type: "Software Development Agreement",
    startDate: "2025-07-15",
    endDate: "2026-07-15",
    status: "Pending",
    createdDate: "2025-07-15 11:00",
    description:
      "Secure mobile banking app with biometric authentication, real-time transfers, investment tracking, and budgeting tools.",
    duration: 365,
  },
  {
    id: 17,
    number: "CON0004",
    subject: "Data Warehouse Implementation",
    userName: "Analytics Pro",
    value: 142000,
    type: "Data Processing Agreement",
    startDate: "2025-07-01",
    endDate: "2026-01-01",
    status: "Closed",
    createdDate: "2025-07-01 09:00",
    description:
      "Enterprise data warehouse with ETL pipelines, real-time analytics dashboards, and predictive modeling capabilities.",
    duration: 184,
  },
  {
    id: 18,
    number: "CON0003",
    subject: "Digital Transformation Roadmap",
    userName: "Innovate Ltd",
    value: 95000,
    type: "Consulting Services Contract",
    startDate: "2025-06-15",
    endDate: "2025-12-15",
    status: "Closed",
    createdDate: "2025-06-15 10:00",
    description:
      "Strategic digital transformation consulting including technology assessment, roadmap planning, and change management.",
    duration: 183,
  },
  {
    id: 19,
    number: "CON0002",
    subject: "Automated Testing Framework",
    userName: "QA Excellence",
    value: 58000,
    type: "Statement of Work (SOW)",
    startDate: "2025-06-01",
    endDate: "2025-10-01",
    status: "Closed",
    createdDate: "2025-06-01 08:00",
    description:
      "End-to-end automated testing framework with CI/CD integration, regression test suites, and performance benchmarking.",
    duration: 122,
  },
  {
    id: 20,
    number: "CON0001",
    subject: "Enterprise CRM Implementation",
    userName: "Sales Force Pro",
    value: 285000,
    type: "Software Development Agreement",
    startDate: "2025-05-01",
    endDate: "2026-05-01",
    status: "Accepted",
    createdDate: "2025-05-01 09:00",
    description:
      "Full CRM implementation with sales pipeline, customer segmentation, marketing automation, and analytics integration.",
    duration: 365,
  },
];

const sampleAttachments: Attachment[] = [
  {
    id: 1,
    fileName: "security_compliance_report.pdf",
    uploadedBy: "Mark Allen",
    date: "2025-12-13",
  },
  {
    id: 2,
    fileName: "user_manual.pdf",
    uploadedBy: "Professional Services",
    date: "2025-12-29",
  },
  {
    id: 3,
    fileName: "security_compliance_report.pdf",
    uploadedBy: "Anthony Walker",
    date: "2025-12-16",
  },
];

const sampleComments: Comment[] = [
  {
    id: 1,
    author: "Professional Services",
    avatar: "P",
    date: "2026-01-22 12:33",
    text: "Performance testing results exceed expected benchmarks.",
  },
];

const sampleNotes: Note[] = [
  {
    id: 1,
    author: "Elite Enterprises",
    avatar: "E",
    date: "2026-01-12 12:33",
    text: "Performance requirements updated to handle 10,000 concurrent users.",
  },
  {
    id: 2,
    author: "Innovative Corp",
    avatar: "I",
    date: "2025-12-16 12:33",
    text: "Change request submitted for additional reporting dashboard features.",
  },
  {
    id: 3,
    author: "Prime Services Co",
    avatar: "PS",
    date: "2025-12-11 12:33",
    text: "Budget allocation approved for additional security features implementation.",
  },
];

const sampleRenewals: Renewal[] = [
  {
    id: 1,
    startDate: "2026-01-30",
    endDate: "2026-11-30",
    value: 228000,
    status: "Active",
    createdBy: "Company",
  },
  {
    id: 2,
    startDate: "2026-07-15",
    endDate: "2027-06-15",
    value: 248520,
    status: "Active",
    createdBy: "Company",
  },
];

const CONTRACT_TYPES = [
  "Data Processing Agreement",
  "Consulting Services Contract",
  "Software Development Agreement",
  "Vendor Service Agreement",
  "Statement of Work (SOW)",
  "Digital Marketing Agreement",
  "Maintenance & Support Agreement",
  "IT Services Contract",
];
const STATUS_OPTIONS: ContractStatus[] = [
  "Accepted",
  "Pending",
  "Closed",
  "Declined",
  "Draft",
];
const USER_OPTIONS = [
  "Prime Services Co",
  "Mark Allen",
  "Nicole Young",
  "ABC Corporation",
  "Amanda White",
  "Jessica Harris",
  "James Garcia",
  "Tech Innovations Inc",
  "Elite Enterprises",
  "John Smith",
  "Global Solutions",
  "Dynamic Corp",
];

// ─── Status badge config ──────────────────────────────────────────────────────

const statusCfg: Record<ContractStatus, string> = {
  Accepted: "bg-green-100 text-green-700 border border-green-200",
  Pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  Closed: "text-gray-600",
  Declined: "bg-red-100 text-red-600 border border-red-200",
  Draft: "bg-gray-100 text-gray-600 border border-gray-200",
};

const StatusBadge: React.FC<{ status: ContractStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg[status]}`}
  >
    {status}
  </span>
);

// ─── Shared helpers ───────────────────────────────────────────────────────────

const SortIcon = () => (
  <span className="inline-flex flex-col ml-1 text-gray-400">
    <ChevronUp className="w-3 h-3 -mb-0.5" />
    <ChevronDown className="w-3 h-3" />
  </span>
);

const AppHeader: React.FC<{
  crumbs: { label: string; onClick?: () => void }[];
}> = ({ crumbs }) => (
  <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-300">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-gray-400">›</span>}
          {c.onClick ? (
            <button onClick={c.onClick} className="hover:text-gray-700">
              {c.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
    <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
      <Globe className="w-4 h-4" />
      <span>en English</span>
    </div>
  </div>
);

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const EditModal: React.FC<{
  contract: Contract;
  onClose: () => void;
  onSave: (c: Contract) => void;
  title?: string; // "Create Contract" reuses this same form
}> = ({ contract, onClose, onSave, title }) => {
  const [form, setForm] = useState({ ...contract });
  const upd = (k: keyof Contract, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
          <h2 className="text-base font-semibold text-gray-900">
            {title ?? "Edit Contract"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                value={form.subject}
                onChange={(e) => upd("subject", e.target.value)}
                className="flex-1 border border-emerald-500 rounded-md px-3 py-2 text-sm outline-none"
              />
              <button className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50">
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
                $
              </span>
              <input
                type="number"
                value={form.value}
                onChange={(e) => upd("value", parseFloat(e.target.value))}
                className="flex-1 px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
          {/* Start + End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                <span className="px-2 py-2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => upd("startDate", e.target.value)}
                  className="flex-1 px-2 py-2 text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                <span className="px-2 py-2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => upd("endDate", e.target.value)}
                  className="flex-1 px-2 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) =>
                  upd("status", e.target.value as ContractStatus)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white appearance-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Contract Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.type}
                onChange={(e) => upd("type", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white appearance-none"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Users <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.userName}
                onChange={(e) => upd("userName", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white appearance-none"
              >
                {USER_OPTIONS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(form);
              onClose();
            }}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Contract Header Card (shared across detail tabs) ─────────────────────────

const ContractHeaderCard: React.FC<{ contract: Contract }> = ({ contract }) => (
  <div className="bg-white border-b border-gray-300 px-6 py-5">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <FileCheck className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {contract.subject}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{contract.number}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusCfg[contract.status]}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${contract.status === "Accepted" ? "bg-green-500" : contract.status === "Pending" ? "bg-yellow-500" : "bg-gray-400"}`}
              />
              {contract.status}
              <ChevronDown className="w-3 h-3" />
            </button>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <User className="w-3.5 h-3.5" /> {contract.userName}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="w-3.5 h-3.5" />{" "}
              {contract.createdDate.split(" ")[0]}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-400 mb-0.5">Contract Value</div>
        <div className="text-2xl font-bold text-gray-900">
          $
          {contract.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
        <span className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full border border-emerald-200">
          {contract.type}
        </span>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Details
// ═══════════════════════════════════════════════════════════════════════════════

const DetailsTab: React.FC<{ contract: Contract }> = ({ contract }) => {
  const InfoCell: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }> = ({ icon, label, value }) => (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Contract Information
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <InfoCell
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Contract Number"
            value={contract.number}
          />
          <InfoCell
            icon={<User className="w-3.5 h-3.5" />}
            label="Client"
            value={<span className="font-bold">{contract.userName}</span>}
          />
          <InfoCell
            icon={<Tag className="w-3.5 h-3.5" />}
            label="Contract Type"
            value={<span className="font-bold">{contract.type}</span>}
          />
          <InfoCell
            icon={<DollarSign className="w-3.5 h-3.5" />}
            label="Contract Value"
            value={`$${contract.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
          <InfoCell
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Start Date"
            value={<span className="font-bold">{contract.startDate}</span>}
          />
          <InfoCell
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="End Date"
            value={<span className="font-bold">{contract.endDate}</span>}
          />
          <InfoCell
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Duration"
            value={`${contract.duration} days`}
          />
          <InfoCell
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Created Date"
            value={<span className="font-bold">{contract.createdDate}</span>}
          />
          <InfoCell
            icon={<Tag className="w-3.5 h-3.5" />}
            label="Status"
            value={<StatusBadge status={contract.status} />}
          />
        </div>
      </div>

      {/* Description */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <FileText className="w-3.5 h-3.5" />
            Description
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-4 py-3 text-sm text-gray-700 min-h-16">
          {contract.description}
        </div>
      </div>

      {/* Signatures */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
          <Tag className="w-4 h-4" />
          Signatures
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Company", name: "Company", date: "2026-01-11 12:33" },
            {
              label: contract.userName,
              name: "Prime Services C",
              date: "2026-01-11 12:33",
            },
          ].map((sig) => (
            <div
              key={sig.label}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {sig.label}
                  </div>
                  <div className="text-xs text-gray-400">
                    Signed on {sig.date}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "cursive",
                  fontSize: 20,
                  color: "#1e3a5f",
                }}
                className="mt-2 pb-1 border-b border-gray-300"
              >
                {sig.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Attachments
// ═══════════════════════════════════════════════════════════════════════════════

const AttachmentsTab: React.FC = () => {
  const [attachments, setAttachments] =
    useState<Attachment[]>(sampleAttachments);
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Attachments</h3>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button className="p-1.5 bg-emerald-500 text-white">
              <List className="w-4 h-4" />
            </button>
            <button className="p-1.5 bg-white text-gray-500 hover:bg-gray-50">
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          <select className="border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white outline-none">
            <option>18 per page</option>
            <option>50 per page</option>
          </select>
          <button className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center">
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 border-b border-gray-300">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-12">
              Preview
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
              File Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
              Uploaded By
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {attachments.map((att) => (
            <tr key={att.id} className="hover:bg-gray-50">
              <td className="px-4 py-3.5">
                <div className="w-8 h-8 border border-gray-200 rounded flex items-center justify-center text-gray-400">
                  <FileText className="w-4 h-4" />
                </div>
              </td>
              <td className="px-4 py-3.5 text-gray-800 font-medium">
                {att.fileName}
              </td>
              <td className="px-4 py-3.5 text-gray-600">{att.uploadedBy}</td>
              <td className="px-4 py-3.5 text-gray-600">{att.date}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <button className="text-teal-500 hover:text-teal-700">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="text-emerald-500 hover:text-emerald-700">
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setAttachments((p) => p.filter((a) => a.id !== att.id))
                    }
                    className="text-red-400 hover:text-red-600"
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
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Comments
// ═══════════════════════════════════════════════════════════════════════════════

const CommentsTab: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>(sampleComments);
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    setComments((p) => [
      ...p,
      {
        id: Date.now(),
        author: "Company",
        avatar: "C",
        date: new Date().toLocaleString(),
        text: text.trim(),
      },
    ]);
    setText("");
  };
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Comments</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
            <Search className="w-4 h-4 text-gray-400 ml-3" />
            <input
              placeholder="Search comments..."
              className="px-3 py-1.5 text-sm outline-none w-44"
            />
          </div>
          <button className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-md">
            Search
          </button>
          <select className="border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white outline-none">
            <option>10 per page</option>
          </select>
        </div>
      </div>
      {/* Compose */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
            C
          </div>
          <span className="text-sm font-medium text-gray-700">Company</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Write your comment..."
          className="w-full bg-white border border-blue-200 rounded-md px-3 py-2 text-sm outline-none resize-none focus:border-blue-400"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={send}
            className="px-4 py-1.5 bg-emerald-500 text-white text-sm rounded-md hover:bg-emerald-600"
          >
            Send
          </button>
        </div>
      </div>
      {/* Comments list */}
      {comments.map((c) => (
        <div key={c.id} className="border border-gray-200 rounded-lg p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center text-white text-xs font-bold">
              {c.avatar}
            </div>
            <span className="text-sm font-medium text-gray-800">
              {c.author}
            </span>
            <span className="text-xs text-gray-400">{c.date}</span>
            <button className="ml-auto text-blue-400 hover:text-blue-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button className="text-red-400 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm text-gray-700">{c.text}</p>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Notes
// ═══════════════════════════════════════════════════════════════════════════════

const NotesTab: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(sampleNotes);
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    setNotes((p) => [
      {
        id: Date.now(),
        author: "Company",
        avatar: "C",
        date: new Date().toLocaleString(),
        text: text.trim(),
      },
      ...p,
    ]);
    setText("");
  };
  const avatarColors = [
    "bg-teal-500",
    "bg-blue-500",
    "bg-pink-400",
    "bg-purple-500",
    "bg-orange-400",
  ];
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Notes</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
            <Search className="w-4 h-4 text-gray-400 ml-3" />
            <input
              placeholder="Search notes..."
              className="px-3 py-1.5 text-sm outline-none w-44"
            />
          </div>
          <button className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-md">
            Search
          </button>
          <select className="border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white outline-none">
            <option>10 per page</option>
          </select>
        </div>
      </div>
      {/* Compose */}
      <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
            C
          </div>
          <span className="text-sm font-medium text-emerald-600">Company</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Write your note..."
          className="w-full bg-white border border-green-200 rounded-md px-3 py-2 text-sm outline-none resize-none focus:border-green-400"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={send}
            className="px-4 py-1.5 bg-emerald-500 text-white text-sm rounded-md hover:bg-emerald-600"
          >
            Send
          </button>
        </div>
      </div>
      {/* Notes list */}
      {notes.map((n, i) => (
        <div key={n.id} className="border border-gray-200 rounded-lg p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-8 h-8 rounded-full ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold`}
            >
              {n.avatar}
            </div>
            <span className="text-sm font-medium text-gray-800">
              {n.author}
            </span>
            <span className="text-xs text-gray-400">{n.date}</span>
            <button className="ml-auto text-blue-400 hover:text-blue-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setNotes((p) => p.filter((x) => x.id !== n.id))}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm text-gray-700">{n.text}</p>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Renewals
// ═══════════════════════════════════════════════════════════════════════════════

const RenewalsTab: React.FC = () => {
  const [renewals] = useState<Renewal[]>(sampleRenewals);
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Contract Renewals
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
            <Search className="w-4 h-4 text-gray-400 ml-3" />
            <input
              placeholder="Search renewals..."
              className="px-3 py-1.5 text-sm outline-none w-44"
            />
          </div>
          <button className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-md">
            Search
          </button>
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button className="p-1.5 bg-emerald-500 text-white">
              <List className="w-4 h-4" />
            </button>
            <button className="p-1.5 bg-white text-gray-500">
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          <select className="border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white outline-none">
            <option>10 per page</option>
          </select>
          <button className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 border-b border-gray-300">
          <tr>
            {[
              "Start Date",
              "End Date",
              "Value",
              "Status",
              "Created By",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {renewals.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3.5 text-gray-800">{r.startDate}</td>
              <td className="px-4 py-3.5 text-gray-800">{r.endDate}</td>
              <td className="px-4 py-3.5 text-gray-800">
                ${r.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3.5 text-gray-600">{r.createdBy}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <button className="text-teal-500 hover:text-teal-700">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="text-blue-400 hover:text-blue-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
        <span>
          Showing <strong>1</strong> to <strong>{renewals.length}</strong> of{" "}
          <strong>{renewals.length}</strong> results
        </span>
        <div className="flex items-center gap-1">
          <button
            className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
            disabled
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button className="w-8 h-8 text-sm rounded bg-emerald-500 text-white">
            1
          </button>
          <button
            className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
            disabled
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Details Contract (all tabs)
// ═══════════════════════════════════════════════════════════════════════════════

const DetailsContract: React.FC<{
  contract: Contract;
  onBack: () => void;
  onPreview: () => void;
}> = ({ contract, onBack, onPreview }) => {
  const [activeTab, setActiveTab] = useState<DetailsTab>("details");
  const tabs: {
    id: DetailsTab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: "details",
      label: "Details",
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: "attachments",
      label: "Attachments",
      icon: <Paperclip className="w-3.5 h-3.5" />,
      count: 3,
    },
    {
      id: "comments",
      label: "Comments",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      count: 1,
    },
    {
      id: "notes",
      label: "Notes",
      icon: <StickyNote className="w-3.5 h-3.5" />,
      count: 3,
    },
    {
      id: "renewals",
      label: "Renewals",
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      count: 2,
    },
  ];
  return (
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm flex flex-col overflow-hidden">
      <AppHeader
        crumbs={[
          { label: "Dashboard" },
          { label: "Contract", onClick: onBack },
          { label: contract.number },
        ]}
      />
      <div className="bg-white border-b border-gray-300 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Details Contract
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={onPreview}
            className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      <ContractHeaderCard contract={contract} />
      {/* Tabs */}
      <div className="bg-white border-b border-gray-300">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? "border-emerald-500 text-emerald-600 bg-gray-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t.icon} {t.label}
              {t.count !== undefined ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        {activeTab === "details" && <DetailsTab contract={contract} />}
        {activeTab === "attachments" && <AttachmentsTab />}
        {activeTab === "comments" && <CommentsTab />}
        {activeTab === "notes" && <NotesTab />}
        {activeTab === "renewals" && <RenewalsTab />}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Contract Preview
// ═══════════════════════════════════════════════════════════════════════════════

const ContractPreview: React.FC<{ contract: Contract; onBack: () => void }> = ({
  contract,
  onBack,
}) => (
  <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm flex flex-col overflow-hidden">
    <AppHeader
      crumbs={[
        { label: "Dashboard" },
        { label: "Contract", onClick: onBack },
        { label: contract.number, onClick: onBack },
        { label: "Preview" },
      ]}
    />
    <div className="bg-white border-b border-gray-300 px-6 py-3 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">Contract Preview</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">
          <Printer className="w-4 h-4" />
        </button>
        <button className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-6 flex justify-center">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full max-w-3xl">
        {/* Title area */}
        <div className="text-center py-8 border-b border-gray-300">
          <h2 className="text-2xl font-bold text-gray-900">
            {contract.subject}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Contract #{contract.number}
          </p>
        </div>
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-0 border-b border-gray-300">
          {/* Left: Contract Information */}
          <div className="p-8 border-r border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-5">
              Contract Information
            </h3>
            {[
              { label: "Subject:", value: contract.subject },
              { label: "Contract Number:", value: contract.number },
              { label: "Contract Type:", value: contract.type },
              { label: "Status:", value: "Draft" },
            ].map((row) => (
              <div key={row.label} className="mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  {row.label}
                </div>
                <div className="text-sm text-gray-600 mt-0.5">{row.value}</div>
              </div>
            ))}
          </div>
          {/* Right: Contract Details */}
          <div className="p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-5">
              Contract Details
            </h3>
            {[
              { label: "Assigned To:", value: contract.userName },
              {
                label: "Contract Value:",
                value: `$${contract.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
              },
              { label: "Start Date:", value: contract.startDate },
              { label: "End Date:", value: contract.endDate },
            ].map((row) => (
              <div key={row.label} className="mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  {row.label}
                </div>
                <div className="text-sm text-gray-600 mt-0.5">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Description */}
        <div className="p-8 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Description
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {contract.description}
          </p>
        </div>
        {/* Signatures */}
        <div className="p-8 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900 mb-5">
            Signatures
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Company", name: "Company", date: "2026-01-11" },
              {
                label: contract.userName,
                name: "Prime Services C",
                date: "2026-01-11",
              },
            ].map((sig) => (
              <div
                key={sig.label}
                className="border border-gray-200 rounded-lg p-5"
              >
                <div className="text-sm text-gray-500 mb-3">{sig.label}</div>
                <div
                  style={{
                    fontFamily: "cursive",
                    fontSize: 22,
                    color: "#1e3a5f",
                  }}
                  className="pb-1 border-b border-gray-300"
                >
                  {sig.name}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Signed on {sig.date}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div className="py-4 text-center text-xs text-gray-400">
          Generated on {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Manage Contracts List
// ═══════════════════════════════════════════════════════════════════════════════

/* ── persistence (Dexie meta row, seeded from the sample data) ──── */
const CONTRACTS_KEY = "contract:list";
const contractStore = {
  save: async (list: Contract[]) => {
    await db.meta.put({ key: CONTRACTS_KEY, value: list });
  },
  use: (): Contract[] | null | undefined =>
    useLiveQuery(async () => {
      const row = await db.meta.get(CONTRACTS_KEY);
      return row === undefined ? null : (row.value as Contract[]);
    }, []),
};

// ── Backend wiring (/contract/*) ─────────────────────────────────────────────
const cNum = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
};
const mapContract = (d: any): Contract => ({
  id: cNum(String(d._id)),
  _id: String(d._id),
  number: d.contract_number ?? "",
  subject: d.subject ?? "",
  userName: d.party_name ?? "",
  value: Number(d.value) || 0,
  type: d.type ?? "",
  startDate: d.start_date ? String(d.start_date).slice(0, 10) : "",
  endDate: d.end_date ? String(d.end_date).slice(0, 10) : "",
  status: (d.status ?? "Draft") as ContractStatus,
  createdDate: d.createdAt ? String(d.createdAt).slice(0, 10) : "",
  description: d.description ?? "",
  duration: Number(d.duration) || 0,
} as unknown as Contract);
const contractBody = (c: Contract) => ({
  contract_number: c.number,
  subject: c.subject,
  party_name: c.userName,
  value: Number(c.value) || 0,
  type: c.type,
  start_date: c.startDate || undefined,
  end_date: c.endDate || undefined,
  status: c.status,
  description: c.description,
  duration: Number(c.duration) || 0,
});
async function loadContracts(): Promise<boolean> {
  try {
    const res = await api.raw.get("/contract/all");
    const arr = toArray<any>(res.data);
    await contractStore.save(arr.map(mapContract));
    return true;
  } catch {
    return false;
  }
}

const ManageContractsList: React.FC<{
  onView: (c: Contract) => void;
  onPreview: (c: Contract) => void;
}> = ({ onView, onPreview }) => {
  const stored = contractStore.use();
  useEffect(() => {
    // Load real contracts from the backend; fall back to samples on failure.
    loadContracts().then((ok) => {
      if (!ok && stored === null) contractStore.save(sampleContracts);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const contracts = stored || sampleContracts;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<Contract | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const perPage = 10;

  const filtered = contracts.filter(
    (c) =>
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.number.toLowerCase().includes(search.toLowerCase()) ||
      c.userName.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSave = async (updated: Contract) => {
    const bid = (updated as any)._id;
    if (bid) {
      try {
        await api.raw.patch(`/contract/${bid}`, contractBody(updated));
        await loadContracts();
        return;
      } catch { /* fall through to local */ }
    }
    contractStore.save(contracts.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCreate = async (c: Contract) => {
    const duration = Math.max(0, Math.round((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / 86400000)) || 0;
    try {
      await api.raw.post("/contract/create", contractBody({ ...c, duration }));
      await loadContracts();
      return;
    } catch { /* fall through to local */ }
    const nextId = Math.max(0, ...contracts.map((x) => x.id)) + 1;
    const nextNum = Math.max(0, ...contracts.map((x) => parseInt(x.number.replace(/\D/g, ""), 10) || 0)) + 1;
    contractStore.save([
      { ...c, id: nextId, number: `CON${String(nextNum).padStart(4, "0")}`, createdDate: new Date().toISOString().slice(0, 16).replace("T", " "), duration },
      ...contracts,
    ]);
  };

  // blank record fed to the shared modal when creating
  const blankContract = (): Contract => ({
    id: 0,
    number: "",
    subject: "",
    userName: "",
    value: 0,
    type: CONTRACT_TYPES[0],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    status: "Draft",
    createdDate: "",
    description: "",
    duration: 0,
  });

  return (
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm flex flex-col overflow-hidden">
      <AppHeader crumbs={[{ label: "Dashboard" }, { label: "Contracts" }]} />
      <div className="bg-white border-b border-gray-300 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Manage Contracts
        </h1>
        <button onClick={() => setCreateOpen(true)} title="Create Contract" className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {createOpen && (
        <EditModal
          title="Create Contract"
          contract={blankContract()}
          onClose={() => setCreateOpen(false)}
          onSave={handleCreate}
        />
      )}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
              <Search className="w-4 h-4 text-gray-400 ml-3" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Contracts..."
                className="px-3 py-2 text-sm outline-none w-52"
              />
            </div>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium">
              Search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              <button className="p-2 bg-emerald-500 text-white">
                <List className="w-4 h-4" />
              </button>
              <button className="p-2 bg-white text-gray-500 hover:bg-gray-50">
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <select className="appearance-none border border-gray-200 rounded-md pl-3 pr-8 py-2 text-sm bg-white text-gray-700 outline-none">
                <option>10 per page</option>
                <option>25 per page</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 bg-white hover:bg-gray-50">
              <Filter className="w-4 h-4" /> Filters{" "}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Contract Number <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Subject <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  User Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  End Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((contract) => (
                <tr
                  key={contract.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onView(contract)}
                      className="text-blue-500 hover:text-blue-700 hover:underline font-medium text-sm"
                    >
                      {contract.number}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 text-sm">
                    {contract.subject}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {contract.userName}
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 text-sm">
                    $
                    {contract.value.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {contract.type}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {contract.startDate}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {contract.endDate}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={contract.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        className="text-orange-400 hover:text-orange-600"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        className="text-purple-400 hover:text-purple-600"
                        title="PDF"
                        onClick={() => onPreview(contract)}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        className="text-teal-500 hover:text-teal-700"
                        title="View"
                        onClick={() => onView(contract)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="text-blue-400 hover:text-blue-600"
                        title="Edit"
                        onClick={() => setEditTarget(contract)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="text-red-400 hover:text-red-600"
                        title="Delete"
                        onClick={async () => {
                          const bid = (contract as any)._id;
                          if (bid) {
                            try { await api.raw.delete(`/contract/${bid}`); await loadContracts(); return; } catch { /* local */ }
                          }
                          contractStore.save(contracts.filter((c) => c.id !== contract.id));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1} to{" "}
              {Math.min(page * perPage, filtered.length)} of {filtered.length}{" "}
              results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded ${p === page ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {editTarget && (
        <EditModal
          contract={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Root
// ═══════════════════════════════════════════════════════════════════════════════

export const Contracts: React.FC = () => {
  const [view, setView] = useState<AppView>("list");
  const [selected, setSelected] = useState<Contract | null>(null);

  if (view === "preview" && selected)
    return (
      <ContractPreview contract={selected} onBack={() => setView("details")} />
    );
  if (view === "details" && selected)
    return (
      <DetailsContract
        contract={selected}
        onBack={() => setView("list")}
        onPreview={() => setView("preview")}
      />
    );

  return (
    <ManageContractsList
      onView={(c) => {
        setSelected(c);
        setView("details");
      }}
      onPreview={(c) => {
        setSelected(c);
        setView("preview");
      }}
    />
  );
};

export default Contracts;
