/**
 * File: src/pages/hrm/SystemSetup.tsx
 * Complete HRM System Setup page with all modules
 * Includes: Branches, Departments, Designations, Document Types, Award Types, Termination Types,
 * Warning Types, Complaint Types, Holiday Types, Document Categories, Announcement Categories,
 * Event Types, Allowance Types, Deduction Types, Loan Types, Working Days, Ip Restricts
 */

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { useResourceData } from "@/hooks/useResourceData";
import {
  branchHooks, departmentHooks, designationHooks,
  employeeDocumentTypeHooks, awardTypeHooks, terminationTypeHooks,
  warningTypeHooks, complaintTypeHooks, holidayTypeHooks,
  documentCategoryHooks, announcementCategoryHooks, eventTypeHooks,
  allowanceTypeHooks, deductionTypeHooks, loanTypeHooks,
  ipRestrictHooks, hrmSetupExtras,
  type HrmMaster,
} from "@/services/hrm";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Building2,
  Users,
  Briefcase,
  FileText,
  Award,
  AlertTriangle,
  Flag,
  Calendar,
  FolderOpen,
  Megaphone,
  Coffee,
  Gift,
  Home,
  Wifi,
  Shield,
  UserX,
} from "lucide-react";

// ─── Generic mapFromApi ───────────────────────────────────────────────────────

function mapMaster(p: any): { id: string; name: string; [key: string]: any } {
  return {
    ...p,
    id: String(p.id ?? p._id ?? ""),
    name: p.branch_name ?? p.department_name ?? p.designation_name ??
          p.shift_name ?? p.document_name ?? p.warning_type_name ??
          p.complaint_type ?? p.holiday_type ?? p.document_type ??
          p.announcement_category ?? p.event_type ??
          p.termination_type ?? p.name ?? "",
  };
}

// ─── Seed Data (API snake_case shape) ─────────────────────────────────────────

const sampleBranches: HrmMaster[] = [
  {
    id: "1",
    branch_name: "Main Office",
    code: "MO",
    address: "123 Main St",
    city: "New York",
    state: "NY",
    country: "USA",
    phone: "+1234567890",
    email: "main@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Downtown Branch",
    code: "DT",
    address: "456 Downtown Ave",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    phone: "+1234567891",
    email: "downtown@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "North Branch",
    code: "NB",
    address: "789 North Rd",
    city: "Chicago",
    state: "IL",
    country: "USA",
    phone: "+1234567892",
    email: "north@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "South Branch",
    code: "SB",
    address: "321 South Blvd",
    city: "Houston",
    state: "TX",
    country: "USA",
    phone: "+1234567893",
    email: "south@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "East Branch",
    code: "EB",
    address: "555 East Ln",
    city: "Miami",
    state: "FL",
    country: "USA",
    phone: "+1234567894",
    email: "east@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "West Branch",
    code: "WB",
    address: "777 West Dr",
    city: "Seattle",
    state: "WA",
    country: "USA",
    phone: "+1234567895",
    email: "west@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Corporate Headquarters",
    code: "CHQ",
    address: "1000 Corporate Pkwy",
    city: "Dallas",
    state: "TX",
    country: "USA",
    phone: "+1234567896",
    email: "corporate@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Regional Office",
    code: "RO",
    address: "2000 Regional Way",
    city: "Atlanta",
    state: "GA",
    country: "USA",
    phone: "+1234567897",
    email: "regional@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Sales Office",
    code: "SO",
    address: "3000 Sales Blvd",
    city: "Denver",
    state: "CO",
    country: "USA",
    phone: "+1234567898",
    email: "sales@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Customer Service Center",
    code: "CSC",
    address: "4000 Service Rd",
    city: "Phoenix",
    state: "AZ",
    country: "USA",
    phone: "+1234567899",
    email: "service@company.com",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleDepartments: HrmMaster[] = [
  {
    id: "1",
    name: "Human Resources",
    branchId: "8",
    branchName: "Regional Office",
    description: "HR department",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Finance & Accounting",
    branchId: "8",
    branchName: "Regional Office",
    description: "Finance department",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "IT",
    branchId: "8",
    branchName: "Regional Office",
    description: "IT department",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Sales",
    branchId: "9",
    branchName: "Sales Office",
    description: "Sales department",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Marketing",
    branchId: "9",
    branchName: "Sales Office",
    description: "Marketing department",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Customer Service",
    branchId: "9",
    branchName: "Sales Office",
    description: "Customer service",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Legal & Compliance",
    branchId: "10",
    branchName: "Customer Service Center",
    description: "Legal department",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Quality Assurance",
    branchId: "10",
    branchName: "Customer Service Center",
    description: "QA department",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Operations",
    branchId: "3",
    branchName: "North Branch",
    description: "Operations",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Procurement",
    branchId: "3",
    branchName: "North Branch",
    description: "Procurement",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleDesignations: HrmMaster[] = [
  {
    id: "1",
    name: "Senior Executive",
    branchId: "3",
    branchName: "North Branch",
    departmentId: "9",
    departmentName: "Operations",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Executive",
    branchId: "3",
    branchName: "North Branch",
    departmentId: "10",
    departmentName: "Procurement",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Senior Analyst",
    branchId: "3",
    branchName: "North Branch",
    departmentId: "10",
    departmentName: "Procurement",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Analyst",
    branchId: "3",
    branchName: "North Branch",
    departmentId: "10",
    departmentName: "Procurement",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Specialist",
    branchId: "3",
    branchName: "North Branch",
    departmentId: "10",
    departmentName: "Procurement",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Supervisor",
    branchId: "4",
    branchName: "South Branch",
    departmentId: "1",
    departmentName: "Human Resources",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Officer",
    branchId: "4",
    branchName: "South Branch",
    departmentId: "1",
    departmentName: "Human Resources",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Associate",
    branchId: "4",
    branchName: "South Branch",
    departmentId: "1",
    departmentName: "Human Resources",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Senior Associate",
    branchId: "4",
    branchName: "South Branch",
    departmentId: "1",
    departmentName: "Human Resources",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Senior Consultant",
    branchId: "4",
    branchName: "South Branch",
    departmentId: "3",
    departmentName: "IT",
    description: "",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleDocumentTypes: HrmMaster[] = [
  {
    id: "1",
    name: "Employment Contract",
    description: "Signed employment contract",
    isRequired: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Performance Evaluation Records",
    description: "Previous performance evaluation records",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Union Membership Certificate",
    description: "Labor union membership certificate",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Pension Fund Documentation",
    description: "Pension fund enrollment forms",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Security Clearance Documentation",
    description: "Security clearance certificates",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Language Proficiency Certificate",
    description: "Language proficiency test results",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Portfolio Documentation",
    description: "Professional portfolio",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Training Certificates",
    description: "Professional training certificates",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Salary Expectation Form",
    description: "Salary expectation form",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Drug Test Results",
    description: "Pre-employment drug screening results",
    isRequired: false,
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleAwardTypes: HrmMaster[] = [
  {
    id: "1",
    name: "Employee of the Month",
    description: "Best performing employee each month",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Best Team Player",
    description: "Outstanding collaboration and teamwork",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Customer Hero Award",
    description: "Exceptional customer service",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Innovation Champion",
    description: "Creative solutions",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Leadership Excellence",
    description: "Strong leadership qualities",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Rookie of the Year",
    description: "Most promising new employee",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Outstanding Attendance",
    description: "Consistent punctuality and attendance",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Sales Star",
    description: "Top sales performance",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Excellence in Quality",
    description: "Exceptional standards of work quality",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Community Contributor",
    description: "Community initiatives contribution",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleTerminationTypes: HrmMaster[] = [
  {
    id: "1",
    name: "Voluntary Resignation",
    description: "Employee initiated resignation",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Retirement",
    description: "Age or service based retirement",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Layoff",
    description: "Economic or structural layoff",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Termination for Cause",
    description: "Misconduct or policy violation",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "End of Contract",
    description: "Fixed term contract completion",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleWarningTypes: HrmMaster[] = [
  {
    id: "1",
    name: "Repeated Errors",
    description: "Repeated mistakes",
    severity: "Low",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Non-Compliance with Safety Rules",
    description: "Safety violation",
    severity: "High",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Workplace Misconduct",
    description: "Misconduct at work",
    severity: "High",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Unapproved Leave",
    description: "Leave without approval",
    severity: "Medium",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Improper Communication with Client",
    description: "Client communication issue",
    severity: "Medium",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Delay in Task Submission",
    description: "Task deadline missed",
    severity: "Low",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Data Privacy Violation",
    description: "Data privacy breach",
    severity: "High",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Insubordination",
    description: "Disobedience",
    severity: "High",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Poor Team Collaboration",
    description: "Teamwork issues",
    severity: "Medium",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Failure to Follow Instructions",
    description: "Instruction non-compliance",
    severity: "Medium",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleComplaintTypes: HrmMaster[] = [
  {
    id: "1",
    name: "General Administrative Issues",
    description: "Administrative complaints",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Legal & Regulatory Compliance",
    description: "Compliance issues",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Diversity & Inclusion Concerns",
    description: "Diversity issues",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Remote Work & Flexibility Issues",
    description: "Remote work concerns",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Security & Access Control",
    description: "Security issues",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Environmental & Sustainability Issues",
    description: "Environmental concerns",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Financial & Budget Concerns",
    description: "Financial complaints",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Customer Service & Relations",
    description: "Customer service issues",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Quality & Process Improvement",
    description: "Quality issues",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Vendor & External Relations",
    description: "Vendor concerns",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleHolidayTypes: HrmMaster[] = [
  {
    id: "1",
    name: "National Holiday",
    description: "National public holiday",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Religious Holiday",
    description: "Religious observance",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Company Holiday",
    description: "Company declared holiday",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Public Holiday",
    description: "Government declared",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Federal Holiday",
    description: "Federal government holiday",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "State Holiday",
    description: "State government holiday",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Local Holiday",
    description: "Local municipal holiday",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Cultural Holiday",
    description: "Cultural celebration",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Seasonal Holiday",
    description: "Seasonal observance",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Memorial Holiday",
    description: "Memorial day",
    isPaid: true,
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleDocumentCategories: HrmMaster[] = [
  {
    id: "1",
    name: "Identity Documents",
    status: "Enabled",
    description: "ID proofs",
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Educational Certificates",
    status: "Enabled",
    description: "Degree certificates",
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Employment Records",
    status: "Enabled",
    description: "Employment history",
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Medical Records",
    status: "Enabled",
    description: "Health records",
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Financial Documents",
    status: "Enabled",
    description: "Bank statements",
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Legal Documents",
    status: "Enabled",
    description: "Legal papers",
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Insurance Papers",
    status: "Enabled",
    description: "Insurance documents",
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Tax Documents",
    status: "Enabled",
    description: "Tax returns",
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Property Documents",
    status: "Enabled",
    description: "Property deeds",
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Vehicle Documents",
    status: "Enabled",
    description: "Vehicle registration",
    createdAt: "2024-01-01",
  },
];

const sampleAnnouncementCategories: HrmMaster[] = [
  {
    id: "1",
    name: "General Company Information",
    description: "General announcements",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Vendor & Supplier Communications",
    description: "Vendor updates",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Social & Community Engagement",
    description: "Community events",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Career Development Opportunities",
    description: "Career growth",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Performance Review & Feedback",
    description: "Performance updates",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Remote Work & Flexibility Updates",
    description: "Remote work policies",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Diversity & Inclusion Initiatives",
    description: "DEI updates",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Emergency & Crisis Communications",
    description: "Emergency alerts",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Market & Industry Insights",
    description: "Industry news",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Innovation & Research Updates",
    description: "R&D updates",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleEventTypes: HrmMaster[] = [
  {
    id: "1",
    name: "Sprint Planning",
    description: "Agile sprint planning",
    color: "#3b82f6",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Strategy Session",
    description: "Strategic planning",
    color: "#10b981",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Product Launch",
    description: "New product release",
    color: "#ef4444",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Networking Event",
    description: "Networking opportunity",
    color: "#8b5cf6",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Awards Ceremony",
    description: "Recognition event",
    color: "#f59e0b",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Holiday Party",
    description: "Celebration",
    color: "#ec4899",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Team Building",
    description: "Team activities",
    color: "#06b6d4",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Onboarding",
    description: "New hire orientation",
    color: "#84cc16",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Interview",
    description: "Candidate interview",
    color: "#a855f7",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Sales Presentation",
    description: "Sales pitch",
    color: "#f97316",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleAllowanceTypes: HrmMaster[] = [
  {
    id: "1",
    name: "House Rent Allowance (HRA)",
    description: "Monthly allowance for accommodation",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Medical Allowance",
    description: "Healthcare allowance",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Transport Allowance",
    description: "Travel allowance",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Food Allowance",
    description: "Meal allowance",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Mobile Allowance",
    description: "Communication allowance",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Education Allowance",
    description: "Children education support",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Performance Bonus",
    description: "Merit-based bonus",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Overtime Allowance",
    description: "Extra hours compensation",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Shift Allowance",
    description: "Night shift extra",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Travel Allowance",
    description: "Business travel expenses",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleDeductionTypes: HrmMaster[] = [
  {
    id: "1",
    name: "Income Tax",
    description: "Tax deducted at source",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Provident Fund (PF)",
    description: "Retirement contribution",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Employee State Insurance (ESI)",
    description: "Medical insurance contribution",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Professional Tax",
    description: "State government tax",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Loan Deduction",
    description: "Loan installment",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Late Coming Fine",
    description: "Attendance penalty",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Absence Deduction",
    description: "Unauthorized leave deduction",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Canteen Charges",
    description: "Meal expenses",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Insurance Premium",
    description: "Health/life insurance",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Uniform Charges",
    description: "Uniform cost deduction",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleLoanTypes: HrmMaster[] = [
  {
    id: "1",
    name: "Personal Loan",
    description: "General purpose loan",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Home Loan",
    description: "Housing loan",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Vehicle Loan",
    description: "Car/motorcycle loan",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Education Loan",
    description: "Higher studies loan",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Medical Loan",
    description: "Healthcare expenses",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Salary Advance",
    description: "Advance against salary",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Festival Advance",
    description: "Seasonal advance",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Travel Loan",
    description: "Vacation expenses",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Equipment Loan",
    description: "Work equipment",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "10",
    name: "Emergency Loan",
    description: "Urgent financial assistance",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

const sampleIpRestricts: HrmMaster[] = [
  {
    id: "1",
    ipAddress: "192.168.1.100",
    description: "Main office",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    ipAddress: "192.168.1.101",
    description: "Backup server",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    ipAddress: "10.0.0.50",
    description: "VPN gateway",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    ipAddress: "10.0.0.51",
    description: "Internal network",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    ipAddress: "172.16.0.10",
    description: "Branch office",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    ipAddress: "203.0.113.25",
    description: "Public web server",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    ipAddress: "198.51.100.30",
    description: "API gateway",
    isActive: true,
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    ipAddress: "192.0.2.15",
    description: "Test environment",
    isActive: true,
    createdAt: "2024-01-01",
  },
];

type ModuleType =
  | "branches"
  | "departments"
  | "designations"
  | "documentTypes"
  | "awardTypes"
  | "terminationTypes"
  | "warningTypes"
  | "complaintTypes"
  | "holidayTypes"
  | "documentCategories"
  | "announcementCategories"
  | "eventTypes"
  | "allowanceTypes"
  | "deductionTypes"
  | "loanTypes"
  | "workingDays"
  | "ipRestricts";

// ─── Main Component ──────────────────────────────────────────────────────────

export const HRMSystemSetup: React.FC = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<ModuleType>("branches");

  // ─── API data hooks for all masters ─────────────────────────────────────────
  const P = { page: 1, limit: 100 };
  const branchRes = useResourceData(branchHooks, { seed: sampleBranches, params: P });
  const departmentRes = useResourceData(departmentHooks, { seed: sampleDepartments, params: P });
  const designationRes = useResourceData(designationHooks, { seed: sampleDesignations, params: P });
  const documentTypeRes = useResourceData(employeeDocumentTypeHooks, { seed: sampleDocumentTypes, params: P });
  const awardTypeRes = useResourceData(awardTypeHooks, { seed: sampleAwardTypes, params: P });
  const terminationTypeRes = useResourceData(terminationTypeHooks, { seed: sampleTerminationTypes, params: P });
  const warningTypeRes = useResourceData(warningTypeHooks, { seed: sampleWarningTypes, params: P });
  const complaintTypeRes = useResourceData(complaintTypeHooks, { seed: sampleComplaintTypes, params: P });
  const holidayTypeRes = useResourceData(holidayTypeHooks, { seed: sampleHolidayTypes, params: P });
  const documentCategoryRes = useResourceData(documentCategoryHooks, { seed: sampleDocumentCategories, params: P });
  const announcementCategoryRes = useResourceData(announcementCategoryHooks, { seed: sampleAnnouncementCategories, params: P });
  const eventTypeRes = useResourceData(eventTypeHooks, { seed: sampleEventTypes, params: P });
  const allowanceTypeRes = useResourceData(allowanceTypeHooks, { seed: sampleAllowanceTypes, params: P });
  const deductionTypeRes = useResourceData(deductionTypeHooks, { seed: sampleDeductionTypes, params: P });
  const loanTypeRes = useResourceData(loanTypeHooks, { seed: sampleLoanTypes, params: P });
  const ipRestrictRes = useResourceData(ipRestrictHooks, { seed: sampleIpRestricts, params: P });

  // Map raw API items to display shape
  const branches = useMemo(() => branchRes.items.map(mapMaster), [branchRes.items]);
  const departments = useMemo(() => departmentRes.items.map(mapMaster), [departmentRes.items]);
  const designations = useMemo(() => designationRes.items.map(mapMaster), [designationRes.items]);
  const documentTypes = useMemo(() => documentTypeRes.items.map(mapMaster), [documentTypeRes.items]);
  const awardTypes = useMemo(() => awardTypeRes.items.map(mapMaster), [awardTypeRes.items]);
  const terminationTypes = useMemo(() => terminationTypeRes.items.map(mapMaster), [terminationTypeRes.items]);
  const warningTypes = useMemo(() => warningTypeRes.items.map(mapMaster), [warningTypeRes.items]);
  const complaintTypes = useMemo(() => complaintTypeRes.items.map(mapMaster), [complaintTypeRes.items]);
  const holidayTypes = useMemo(() => holidayTypeRes.items.map(mapMaster), [holidayTypeRes.items]);
  const documentCategories = useMemo(() => documentCategoryRes.items.map(mapMaster), [documentCategoryRes.items]);
  const announcementCategories = useMemo(() => announcementCategoryRes.items.map(mapMaster), [announcementCategoryRes.items]);
  const eventTypes = useMemo(() => eventTypeRes.items.map(mapMaster), [eventTypeRes.items]);
  const allowanceTypes = useMemo(() => allowanceTypeRes.items.map(mapMaster), [allowanceTypeRes.items]);
  const deductionTypes = useMemo(() => deductionTypeRes.items.map(mapMaster), [deductionTypeRes.items]);
  const loanTypes = useMemo(() => loanTypeRes.items.map(mapMaster), [loanTypeRes.items]);
  const ipRestricts = useMemo(() => ipRestrictRes.items.map(mapMaster), [ipRestrictRes.items]);

  // Working days
  const [workingDays, setWorkingDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  // Load working days on mount
  useEffect(() => {
    hrmSetupExtras.getWorkingDays().then((res: any) => {
      const days: number[] = res?.working_days ?? res?.data?.working_days ?? [];
      if (days.length > 0) {
        setWorkingDays({
          monday: days.includes(1),
          tuesday: days.includes(2),
          wednesday: days.includes(3),
          thursday: days.includes(4),
          friday: days.includes(5),
          saturday: days.includes(6),
          sunday: days.includes(0),
        });
      }
    }).catch(() => {});
  }, []);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for each module (simplified - using generic approach)
  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    phone: "",
    email: "",
    isActive: true,
  });
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    branchId: "",
    description: "",
    isActive: true,
  });
  const [designationForm, setDesignationForm] = useState({
    name: "",
    branchId: "",
    departmentId: "",
    description: "",
    isActive: true,
  });
  const [documentTypeForm, setDocumentTypeForm] = useState({
    name: "",
    description: "",
    isRequired: false,
    isActive: true,
  });
  const [awardTypeForm, setAwardTypeForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [terminationTypeForm, setTerminationTypeForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [warningTypeForm, setWarningTypeForm] = useState({
    name: "",
    description: "",
    severity: "Medium" as "Low" | "Medium" | "High",
    isActive: true,
  });
  const [complaintTypeForm, setComplaintTypeForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [holidayTypeForm, setHolidayTypeForm] = useState({
    name: "",
    description: "",
    isPaid: true,
    isActive: true,
  });
  const [documentCategoryForm, setDocumentCategoryForm] = useState({
    name: "",
    description: "",
    status: "Enabled" as "Enabled" | "Disabled",
  });
  const [announcementCategoryForm, setAnnouncementCategoryForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [eventTypeForm, setEventTypeForm] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    isActive: true,
  });
  const [allowanceTypeForm, setAllowanceTypeForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [deductionTypeForm, setDeductionTypeForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [loanTypeForm, setLoanTypeForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [ipRestrictForm, setIpRestrictForm] = useState({
    ipAddress: "",
    description: "",
    isActive: true,
  });

  // ─── Lookup helpers: resolve hooks for active module ────────────────────────

  function getActiveHooks() {
    switch (activeModule) {
      case "branches": return branchRes;
      case "departments": return departmentRes;
      case "designations": return designationRes;
      case "documentTypes": return documentTypeRes;
      case "awardTypes": return awardTypeRes;
      case "terminationTypes": return terminationTypeRes;
      case "warningTypes": return warningTypeRes;
      case "complaintTypes": return complaintTypeRes;
      case "holidayTypes": return holidayTypeRes;
      case "documentCategories": return documentCategoryRes;
      case "announcementCategories": return announcementCategoryRes;
      case "eventTypes": return eventTypeRes;
      case "allowanceTypes": return allowanceTypeRes;
      case "deductionTypes": return deductionTypeRes;
      case "loanTypes": return loanTypeRes;
      case "ipRestricts": return ipRestrictRes;
      default: return null;
    }
  }

  // ─── Generic CRUD Helpers ───────────────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: any, type: ModuleType) => {
    setIsEditing(true);
    setEditingId(item.id);
    // Populate form based on type
    switch (type) {
      case "branches":
        setBranchForm({
          name: item.name,
          code: item.code,
          address: item.address,
          city: item.city,
          state: item.state,
          country: item.country,
          phone: item.phone,
          email: item.email,
          isActive: item.isActive,
        });
        break;
      case "departments":
        setDepartmentForm({
          name: item.name,
          branchId: item.branchId,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "designations":
        setDesignationForm({
          name: item.name,
          branchId: item.branchId,
          departmentId: item.departmentId,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "documentTypes":
        setDocumentTypeForm({
          name: item.name,
          description: item.description,
          isRequired: item.isRequired,
          isActive: item.isActive,
        });
        break;
      case "awardTypes":
        setAwardTypeForm({
          name: item.name,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "terminationTypes":
        setTerminationTypeForm({
          name: item.name,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "warningTypes":
        setWarningTypeForm({
          name: item.name,
          description: item.description,
          severity: item.severity,
          isActive: item.isActive,
        });
        break;
      case "complaintTypes":
        setComplaintTypeForm({
          name: item.name,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "holidayTypes":
        setHolidayTypeForm({
          name: item.name,
          description: item.description,
          isPaid: item.isPaid,
          isActive: item.isActive,
        });
        break;
      case "documentCategories":
        setDocumentCategoryForm({
          name: item.name,
          description: item.description,
          status: item.status,
        });
        break;
      case "announcementCategories":
        setAnnouncementCategoryForm({
          name: item.name,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "eventTypes":
        setEventTypeForm({
          name: item.name,
          description: item.description,
          color: item.color,
          isActive: item.isActive,
        });
        break;
      case "allowanceTypes":
        setAllowanceTypeForm({
          name: item.name,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "deductionTypes":
        setDeductionTypeForm({
          name: item.name,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "loanTypes":
        setLoanTypeForm({
          name: item.name,
          description: item.description,
          isActive: item.isActive,
        });
        break;
      case "ipRestricts":
        setIpRestrictForm({
          ipAddress: item.ipAddress,
          description: item.description,
          isActive: item.isActive,
        });
        break;
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setBranchForm({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "",
      phone: "",
      email: "",
      isActive: true,
    });
    setDepartmentForm({
      name: "",
      branchId: "",
      description: "",
      isActive: true,
    });
    setDesignationForm({
      name: "",
      branchId: "",
      departmentId: "",
      description: "",
      isActive: true,
    });
    setDocumentTypeForm({
      name: "",
      description: "",
      isRequired: false,
      isActive: true,
    });
    setAwardTypeForm({ name: "", description: "", isActive: true });
    setTerminationTypeForm({ name: "", description: "", isActive: true });
    setWarningTypeForm({
      name: "",
      description: "",
      severity: "Medium",
      isActive: true,
    });
    setComplaintTypeForm({ name: "", description: "", isActive: true });
    setHolidayTypeForm({
      name: "",
      description: "",
      isPaid: true,
      isActive: true,
    });
    setDocumentCategoryForm({ name: "", description: "", status: "Enabled" });
    setAnnouncementCategoryForm({ name: "", description: "", isActive: true });
    setEventTypeForm({
      name: "",
      description: "",
      color: "#3b82f6",
      isActive: true,
    });
    setAllowanceTypeForm({ name: "", description: "", isActive: true });
    setDeductionTypeForm({ name: "", description: "", isActive: true });
    setLoanTypeForm({ name: "", description: "", isActive: true });
    setIpRestrictForm({ ipAddress: "", description: "", isActive: true });
  };

  const handleSave = async () => {
    const hooks = getActiveHooks();
    let toApi: Record<string, unknown> = {};
    let label = "";

    switch (activeModule) {
      case "branches":
        if (!branchForm.name) { showToast("Please enter branch name", "info"); return; }
        toApi = { branch_name: branchForm.name, code: branchForm.code, address: branchForm.address, city: branchForm.city, state: branchForm.state, country: branchForm.country, phone: branchForm.phone, email: branchForm.email };
        label = "Branch";
        break;
      case "departments":
        if (!departmentForm.name) { showToast("Please enter department name", "info"); return; }
        if (!departmentForm.branchId) { showToast("Please select branch", "info"); return; }
        toApi = { department_name: departmentForm.name, branch_id: departmentForm.branchId };
        label = "Department";
        break;
      case "designations":
        if (!designationForm.name) { showToast("Please enter designation name", "info"); return; }
        if (!designationForm.branchId) { showToast("Please select branch", "info"); return; }
        if (!designationForm.departmentId) { showToast("Please select department", "info"); return; }
        toApi = { designation_name: designationForm.name, branch_id: designationForm.branchId, department_id: designationForm.departmentId };
        label = "Designation";
        break;
      case "documentTypes":
        if (!documentTypeForm.name) { showToast("Please enter document type name", "info"); return; }
        toApi = { document_name: documentTypeForm.name, is_required: documentTypeForm.isRequired };
        label = "Document type";
        break;
      case "awardTypes":
        if (!awardTypeForm.name) { showToast("Please enter award type name", "info"); return; }
        toApi = { name: awardTypeForm.name };
        label = "Award type";
        break;
      case "terminationTypes":
        if (!terminationTypeForm.name) { showToast("Please enter termination type name", "info"); return; }
        toApi = { termination_type: terminationTypeForm.name };
        label = "Termination type";
        break;
      case "warningTypes":
        if (!warningTypeForm.name) { showToast("Please enter warning type name", "info"); return; }
        toApi = { warning_type_name: warningTypeForm.name };
        label = "Warning type";
        break;
      case "complaintTypes":
        if (!complaintTypeForm.name) { showToast("Please enter complaint type name", "info"); return; }
        toApi = { complaint_type: complaintTypeForm.name };
        label = "Complaint type";
        break;
      case "holidayTypes":
        if (!holidayTypeForm.name) { showToast("Please enter holiday type name", "info"); return; }
        toApi = { holiday_type: holidayTypeForm.name };
        label = "Holiday type";
        break;
      case "documentCategories":
        if (!documentCategoryForm.name) { showToast("Please enter document category name", "info"); return; }
        toApi = { document_type: documentCategoryForm.name };
        label = "Document category";
        break;
      case "announcementCategories":
        if (!announcementCategoryForm.name) { showToast("Please enter announcement category name", "info"); return; }
        toApi = { announcement_category: announcementCategoryForm.name };
        label = "Announcement category";
        break;
      case "eventTypes":
        if (!eventTypeForm.name) { showToast("Please enter event type name", "info"); return; }
        toApi = { event_type: eventTypeForm.name };
        label = "Event type";
        break;
      case "allowanceTypes":
        if (!allowanceTypeForm.name) { showToast("Please enter allowance type name", "info"); return; }
        toApi = { name: allowanceTypeForm.name };
        label = "Allowance type";
        break;
      case "deductionTypes":
        if (!deductionTypeForm.name) { showToast("Please enter deduction type name", "info"); return; }
        toApi = { name: deductionTypeForm.name };
        label = "Deduction type";
        break;
      case "loanTypes":
        if (!loanTypeForm.name) { showToast("Please enter loan type name", "info"); return; }
        toApi = { name: loanTypeForm.name };
        label = "Loan type";
        break;
      case "ipRestricts":
        if (!ipRestrictForm.ipAddress) { showToast("Please enter IP address", "info"); return; }
        toApi = { ip: ipRestrictForm.ipAddress };
        label = "IP restrict";
        break;
      case "workingDays":
        showToast("Working days saved successfully!", "success");
        return;
    }

    if (!hooks) return;
    try {
      if (isEditing && editingId) {
        await hooks.update(editingId, toApi);
        showToast(`${label} updated successfully!`, "success");
      } else {
        await hooks.create(toApi);
        showToast(`${label} created successfully!`, "success");
      }
    } catch {
      showToast("Operation failed. Please try again.", "error");
    }
    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id: string, type: ModuleType, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const hooksMap: Partial<Record<ModuleType, typeof branchRes>> = {
      branches: branchRes, departments: departmentRes, designations: designationRes,
      documentTypes: documentTypeRes, awardTypes: awardTypeRes,
      terminationTypes: terminationTypeRes, warningTypes: warningTypeRes,
      complaintTypes: complaintTypeRes, holidayTypes: holidayTypeRes,
      documentCategories: documentCategoryRes, announcementCategories: announcementCategoryRes,
      eventTypes: eventTypeRes, allowanceTypes: allowanceTypeRes,
      deductionTypes: deductionTypeRes, loanTypes: loanTypeRes,
      ipRestricts: ipRestrictRes,
    };
    const h = hooksMap[type];
    if (!h) return;
    try {
      await h.remove(id);
      showToast(`${type} deleted successfully!`, "success");
    } catch {
      showToast("Delete failed. Please try again.", "error");
    }
  };

  const handleWorkingDaysSave = async () => {
    const days: number[] = [];
    if (workingDays.sunday) days.push(0);
    if (workingDays.monday) days.push(1);
    if (workingDays.tuesday) days.push(2);
    if (workingDays.wednesday) days.push(3);
    if (workingDays.thursday) days.push(4);
    if (workingDays.friday) days.push(5);
    if (workingDays.saturday) days.push(6);
    try {
      await hrmSetupExtras.updateWorkingDays(days);
      showToast("Working days saved successfully!", "success");
    } catch {
      showToast("Save failed. Please try again.", "error");
    }
  };

  // ─── Render Module Content ──────────────────────────────────────────────────

  const renderModuleContent = () => {
    switch (activeModule) {
      case "branches":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Branches</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Branch
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Branch Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      City
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      State
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {b.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.code}</td>
                      <td className="px-4 py-3 text-gray-600">{b.city}</td>
                      <td className="px-4 py-3 text-gray-600">{b.state}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${b.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {b.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(b, "branches")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(b.id, "branches", b.name)
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
      case "departments":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Departments</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Department
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Department Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Branch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {d.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {d.branchName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {d.description}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(d, "departments")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(d.id, "departments", d.name)
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
      case "designations":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Designations</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Designation
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Designation Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Branch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {designations.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {d.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {d.branchName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {d.departmentName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(d, "designations")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(d.id, "designations", d.name)
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
      case "documentTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Document Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Document Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Document Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Is Required
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documentTypes.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {d.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-md">
                        {d.description}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${d.isRequired ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}
                        >
                          {d.isRequired ? "Required" : "Not Required"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(d, "documentTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(d.id, "documentTypes", d.name)
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
      case "awardTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Award Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Award Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {awardTypes.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {a.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-md">
                        {a.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(a, "awardTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(a.id, "awardTypes", a.name)
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
      case "terminationTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Termination Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Termination Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {terminationTypes.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {t.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-md">
                        {t.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(t, "terminationTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(t.id, "terminationTypes", t.name)
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
      case "warningTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Warning Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Warning Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Warning Type Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {warningTypes.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {w.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${w.severity === "High" ? "bg-red-100 text-red-700" : w.severity === "Medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}
                        >
                          {w.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(w, "warningTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(w.id, "warningTypes", w.name)
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
      case "complaintTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Complaint Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Complaint Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Complaint Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {complaintTypes.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {c.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(c, "complaintTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(c.id, "complaintTypes", c.name)
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
      case "holidayTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Holiday Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Holiday Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Holiday Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {holidayTypes.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {h.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(h, "holidayTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(h.id, "holidayTypes", h.name)
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
      case "documentCategories":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                Document Categories
              </h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Document Category
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Document Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documentCategories.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {d.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "Enabled" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              openEditModal(d, "documentCategories")
                            }
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(d.id, "documentCategories", d.name)
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
      case "announcementCategories":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                Announcement Categories
              </h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Announcement Category
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Announcement Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {announcementCategories.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {a.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              openEditModal(a, "announcementCategories")
                            }
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(
                                a.id,
                                "announcementCategories",
                                a.name,
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
      case "eventTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Event Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Event Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Event Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eventTypes.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {e.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(e, "eventTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(e.id, "eventTypes", e.name)
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
      case "allowanceTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Allowance Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Allowance Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allowanceTypes.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {a.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-md">
                        {a.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(a, "allowanceTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(a.id, "allowanceTypes", a.name)
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
      case "deductionTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Deduction Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Deduction Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deductionTypes.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {d.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-md">
                        {d.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(d, "deductionTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(d.id, "deductionTypes", d.name)
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
      case "loanTypes":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Loan Types</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Loan Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loanTypes.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {l.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-md">
                        {l.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(l, "loanTypes")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(l.id, "loanTypes", l.name)
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
      case "workingDays":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Working Days</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select the days of the week that are considered working days for
              your organization.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workingDays.monday}
                  onChange={(e) =>
                    setWorkingDays({ ...workingDays, monday: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Monday</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workingDays.tuesday}
                  onChange={(e) =>
                    setWorkingDays({
                      ...workingDays,
                      tuesday: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Tuesday</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workingDays.wednesday}
                  onChange={(e) =>
                    setWorkingDays({
                      ...workingDays,
                      wednesday: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Wednesday</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workingDays.thursday}
                  onChange={(e) =>
                    setWorkingDays({
                      ...workingDays,
                      thursday: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Thursday</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workingDays.friday}
                  onChange={(e) =>
                    setWorkingDays({ ...workingDays, friday: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Friday</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workingDays.saturday}
                  onChange={(e) =>
                    setWorkingDays({
                      ...workingDays,
                      saturday: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Saturday</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workingDays.sunday}
                  onChange={(e) =>
                    setWorkingDays({ ...workingDays, sunday: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Sunday</span>
              </label>
            </div>
            <button
              onClick={handleWorkingDaysSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        );
      case "ipRestricts":
        return (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">IP Restricts</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add IP
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ipRestricts.map((i) => (
                    <tr
                      key={i.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-gray-900">
                        {i.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {i.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(i, "ipRestricts")}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(i.id, "ipRestricts", i.ipAddress)
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
      default:
        return null;
    }
  };

  // ─── Generic Modal ──────────────────────────────────────────────────────────

  const renderModal = () => {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? "Edit" : "Create"} {activeModule.slice(0, -1)}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditing ? "Update information" : "Add new entry"}
              </p>
            </div>
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6">
            {activeModule === "branches" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    value={branchForm.name}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={branchForm.code}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, code: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={branchForm.address}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={branchForm.city}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={branchForm.state}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, state: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={branchForm.country}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          country: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={branchForm.phone}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={branchForm.isActive}
                    onChange={(e) =>
                      setBranchForm({
                        ...branchForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "departments" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    value={departmentForm.name}
                    onChange={(e) =>
                      setDepartmentForm({
                        ...departmentForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch *
                  </label>
                  <select
                    value={departmentForm.branchId}
                    onChange={(e) =>
                      setDepartmentForm({
                        ...departmentForm,
                        branchId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={departmentForm.description}
                    onChange={(e) =>
                      setDepartmentForm({
                        ...departmentForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={departmentForm.isActive}
                    onChange={(e) =>
                      setDepartmentForm({
                        ...departmentForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "designations" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation Name *
                  </label>
                  <input
                    type="text"
                    value={designationForm.name}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch *
                  </label>
                  <select
                    value={designationForm.branchId}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        branchId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={designationForm.departmentId}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        departmentId: e.target.value,
                      })
                    }
                    disabled={!designationForm.branchId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-100"
                  >
                    <option value="">Select Department</option>
                    {departments
                      .filter((d) => d.branchId === designationForm.branchId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={designationForm.description}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={designationForm.isActive}
                    onChange={(e) =>
                      setDesignationForm({
                        ...designationForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "documentTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={documentTypeForm.name}
                    onChange={(e) =>
                      setDocumentTypeForm({
                        ...documentTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={documentTypeForm.description}
                    onChange={(e) =>
                      setDocumentTypeForm({
                        ...documentTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={documentTypeForm.isRequired}
                    onChange={(e) =>
                      setDocumentTypeForm({
                        ...documentTypeForm,
                        isRequired: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={documentTypeForm.isActive}
                    onChange={(e) =>
                      setDocumentTypeForm({
                        ...documentTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "awardTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={awardTypeForm.name}
                    onChange={(e) =>
                      setAwardTypeForm({
                        ...awardTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={awardTypeForm.description}
                    onChange={(e) =>
                      setAwardTypeForm({
                        ...awardTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={awardTypeForm.isActive}
                    onChange={(e) =>
                      setAwardTypeForm({
                        ...awardTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "terminationTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={terminationTypeForm.name}
                    onChange={(e) =>
                      setTerminationTypeForm({
                        ...terminationTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={terminationTypeForm.description}
                    onChange={(e) =>
                      setTerminationTypeForm({
                        ...terminationTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={terminationTypeForm.isActive}
                    onChange={(e) =>
                      setTerminationTypeForm({
                        ...terminationTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "warningTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warning Type Name *
                  </label>
                  <input
                    type="text"
                    value={warningTypeForm.name}
                    onChange={(e) =>
                      setWarningTypeForm({
                        ...warningTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={warningTypeForm.description}
                    onChange={(e) =>
                      setWarningTypeForm({
                        ...warningTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={warningTypeForm.severity}
                    onChange={(e) =>
                      setWarningTypeForm({
                        ...warningTypeForm,
                        severity: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={warningTypeForm.isActive}
                    onChange={(e) =>
                      setWarningTypeForm({
                        ...warningTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "complaintTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complaint Type *
                  </label>
                  <input
                    type="text"
                    value={complaintTypeForm.name}
                    onChange={(e) =>
                      setComplaintTypeForm({
                        ...complaintTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={complaintTypeForm.description}
                    onChange={(e) =>
                      setComplaintTypeForm({
                        ...complaintTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={complaintTypeForm.isActive}
                    onChange={(e) =>
                      setComplaintTypeForm({
                        ...complaintTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "holidayTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Type *
                  </label>
                  <input
                    type="text"
                    value={holidayTypeForm.name}
                    onChange={(e) =>
                      setHolidayTypeForm({
                        ...holidayTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={holidayTypeForm.description}
                    onChange={(e) =>
                      setHolidayTypeForm({
                        ...holidayTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={holidayTypeForm.isPaid}
                    onChange={(e) =>
                      setHolidayTypeForm({
                        ...holidayTypeForm,
                        isPaid: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Paid</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={holidayTypeForm.isActive}
                    onChange={(e) =>
                      setHolidayTypeForm({
                        ...holidayTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "documentCategories" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type *
                  </label>
                  <input
                    type="text"
                    value={documentCategoryForm.name}
                    onChange={(e) =>
                      setDocumentCategoryForm({
                        ...documentCategoryForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={documentCategoryForm.status}
                    onChange={(e) =>
                      setDocumentCategoryForm({
                        ...documentCategoryForm,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={documentCategoryForm.description}
                    onChange={(e) =>
                      setDocumentCategoryForm({
                        ...documentCategoryForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
              </div>
            )}
            {activeModule === "announcementCategories" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Announcement Category *
                  </label>
                  <input
                    type="text"
                    value={announcementCategoryForm.name}
                    onChange={(e) =>
                      setAnnouncementCategoryForm({
                        ...announcementCategoryForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={announcementCategoryForm.description}
                    onChange={(e) =>
                      setAnnouncementCategoryForm({
                        ...announcementCategoryForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={announcementCategoryForm.isActive}
                    onChange={(e) =>
                      setAnnouncementCategoryForm({
                        ...announcementCategoryForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "eventTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type *
                  </label>
                  <input
                    type="text"
                    value={eventTypeForm.name}
                    onChange={(e) =>
                      setEventTypeForm({
                        ...eventTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={eventTypeForm.description}
                    onChange={(e) =>
                      setEventTypeForm({
                        ...eventTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={eventTypeForm.color}
                      onChange={(e) =>
                        setEventTypeForm({
                          ...eventTypeForm,
                          color: e.target.value,
                        })
                      }
                      className="w-10 h-10 border border-gray-300 rounded-md"
                    />
                    <input
                      type="text"
                      value={eventTypeForm.color}
                      onChange={(e) =>
                        setEventTypeForm({
                          ...eventTypeForm,
                          color: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eventTypeForm.isActive}
                    onChange={(e) =>
                      setEventTypeForm({
                        ...eventTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "allowanceTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={allowanceTypeForm.name}
                    onChange={(e) =>
                      setAllowanceTypeForm({
                        ...allowanceTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={allowanceTypeForm.description}
                    onChange={(e) =>
                      setAllowanceTypeForm({
                        ...allowanceTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowanceTypeForm.isActive}
                    onChange={(e) =>
                      setAllowanceTypeForm({
                        ...allowanceTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "deductionTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={deductionTypeForm.name}
                    onChange={(e) =>
                      setDeductionTypeForm({
                        ...deductionTypeForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={deductionTypeForm.description}
                    onChange={(e) =>
                      setDeductionTypeForm({
                        ...deductionTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deductionTypeForm.isActive}
                    onChange={(e) =>
                      setDeductionTypeForm({
                        ...deductionTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "loanTypes" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={loanTypeForm.name}
                    onChange={(e) =>
                      setLoanTypeForm({ ...loanTypeForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={loanTypeForm.description}
                    onChange={(e) =>
                      setLoanTypeForm({
                        ...loanTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={loanTypeForm.isActive}
                    onChange={(e) =>
                      setLoanTypeForm({
                        ...loanTypeForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
            {activeModule === "ipRestricts" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address *
                  </label>
                  <input
                    type="text"
                    value={ipRestrictForm.ipAddress}
                    onChange={(e) =>
                      setIpRestrictForm({
                        ...ipRestrictForm,
                        ipAddress: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={ipRestrictForm.description}
                    onChange={(e) =>
                      setIpRestrictForm({
                        ...ipRestrictForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ipRestrictForm.isActive}
                    onChange={(e) =>
                      setIpRestrictForm({
                        ...ipRestrictForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Is Active</span>
                </label>
              </div>
            )}
          </div>
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowModal(false);
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
  };

  // ─── Main Render ────────────────────────────────────────────────────────────

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
            onClick={() => navigate("/hrm")}
            className="hover:text-gray-700"
          >
            HRM
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">System Setup</span>
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
                { id: "branches", label: "Branches", icon: Building2 },
                { id: "departments", label: "Departments", icon: Users },
                { id: "designations", label: "Designations", icon: Briefcase },
                {
                  id: "documentTypes",
                  label: "Document Types",
                  icon: FileText,
                },
                { id: "awardTypes", label: "Award Types", icon: Award },
                {
                  id: "terminationTypes",
                  label: "Termination Types",
                  icon: UserX,
                },
                {
                  id: "warningTypes",
                  label: "Warning Types",
                  icon: AlertTriangle,
                },
                { id: "complaintTypes", label: "Complaint Types", icon: Flag },
                { id: "holidayTypes", label: "Holiday Types", icon: Calendar },
                {
                  id: "documentCategories",
                  label: "Document Categories",
                  icon: FolderOpen,
                },
                {
                  id: "announcementCategories",
                  label: "Announcement Categories",
                  icon: Megaphone,
                },
                { id: "eventTypes", label: "Event Types", icon: Coffee },
                { id: "allowanceTypes", label: "Allowance Types", icon: Gift },
                { id: "deductionTypes", label: "Deduction Types", icon: Home },
                { id: "loanTypes", label: "Loan Types", icon: Shield },
                { id: "workingDays", label: "Working Days", icon: Calendar },
                { id: "ipRestricts", label: "IP Restricts", icon: Wifi },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id as ModuleType)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    activeModule === item.id
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
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
          {renderModuleContent()}
        </div>
      </div>

      {/* Modal */}
      {showModal && renderModal()}
    </div>
  );
};
