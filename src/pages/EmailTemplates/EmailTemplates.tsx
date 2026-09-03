/**
 * File: src/pages/email/EmailTemplates.tsx
 * Email Templates Module — exact match for all 3 screenshots:
 *
 * View 1 — Manage Email Templates (list):
 *   - Search email templates... + green Search button
 *   - 10 per page dropdown + Filters button
 *   - Table: Name (sortable) | Module (sortable) | Actions (edit pencil only — no delete)
 *   - 24 templates across 3 pages (Previous / 1 / 2 / 3 / Next)
 *
 * View 2 — Edit Email Template:
 *   - Breadcrumb: Dashboard > Email Templates > Edit Email Template
 *   - Page title: "Edit Email Template : {name}"  + ← Back button
 *   - Left column:
 *       Variables panel — list of {variable} clickable tokens in emerald green
 *       Template Details panel — Name input + From Name input + Save Changes button
 *   - Right column:
 *       "GB Content for English" header + English language dropdown
 *       Subject* input
 *       Email Message rich editor (toolbar + editable content area)
 *       Save Changes button (bottom-right)
 */

import React, { useState } from "react";
import {
  Globe,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowLeft,
  Save,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: number;
  name: string;
  module: string;
  subject: string;
  fromName: string;
  body: string;
  variables: { label: string; token: string }[];
}

// ─── Sample Data (24 templates, 3 pages) ──────────────────────────────────────

const templates: EmailTemplate[] = [
  {
    id: 1,
    name: "Deal Move",
    module: "CRM",
    subject: "Deal has been Moved",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "App Name:", token: "{app_name}" },
      { label: "Company Name :", token: "{company_name}" },
      { label: "Deal Name:", token: "{deal_name}" },
      { label: "Deal Pipeline:", token: "{deal_pipeline}" },
      { label: "Deal Status:", token: "{deal_status}" },
      { label: "Deal Price:", token: "{deal_price}" },
      { label: "Deal Old Stage:", token: "{deal_old_stage}" },
      { label: "Deal New Stage:", token: "{deal_new_stage}" },
    ],
    body: `Deal Stage Updated 🚀\nA deal has been successfully moved to a new stage\nHello,\nThe deal {deal_name} has been moved to a new stage in the pipeline. Please find the updated deal information below.\n**Deal Name:** {deal_name}\n**Pipeline:** {deal_pipeline}\n**Previous Stage:** {deal_old_stage}\n**New Stage:** {deal_new_stage}\n**Status:** {deal_status}\n**Deal Price:** {deal_price}\n[View Deal]\nIf you have any questions regarding this update, feel free to contact us.`,
  },
  {
    id: 2,
    name: "Deal Assign",
    module: "CRM",
    subject: "Deal Assigned to You",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "App Name:", token: "{app_name}" },
      { label: "Company Name:", token: "{company_name}" },
      { label: "Deal Name:", token: "{deal_name}" },
      { label: "Assignee Name:", token: "{assignee_name}" },
      { label: "Deal Pipeline:", token: "{deal_pipeline}" },
    ],
    body: `Hello,\nA new deal {deal_name} has been assigned to you.\n**Assignee:** {assignee_name}\n**Pipeline:** {deal_pipeline}\nPlease review the deal details in the system.`,
  },
  {
    id: 3,
    name: "Lead Move",
    module: "CRM",
    subject: "Lead has been Moved",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Lead Name:", token: "{lead_name}" },
      { label: "Lead Stage:", token: "{lead_stage}" },
      { label: "Old Stage:", token: "{old_stage}" },
    ],
    body: `Hello,\nThe lead {lead_name} has been moved.\n**Old Stage:** {old_stage}\n**New Stage:** {lead_stage}`,
  },
  {
    id: 4,
    name: "Lead Assign",
    module: "CRM",
    subject: "Lead Assigned to You",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Lead Name:", token: "{lead_name}" },
      { label: "Assignee Name:", token: "{assignee_name}" },
    ],
    body: `Hello,\nThe lead {lead_name} has been assigned to {assignee_name}.\nPlease review and take appropriate action.`,
  },
  {
    id: 5,
    name: "Application Received",
    module: "Recruitment",
    subject: "Application Received",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Applicant Name:", token: "{applicant_name}" },
      { label: "Job Title:", token: "{job_title}" },
      { label: "Company Name:", token: "{company_name}" },
    ],
    body: `Dear {applicant_name},\nThank you for applying for {job_title} at {company_name}.\nWe have received your application and will review it shortly.`,
  },
  {
    id: 6,
    name: "Offer Letter",
    module: "Recruitment",
    subject: "Offer Letter - {job_title}",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Applicant Name:", token: "{applicant_name}" },
      { label: "Job Title:", token: "{job_title}" },
      { label: "Start Date:", token: "{start_date}" },
      { label: "Salary:", token: "{salary}" },
    ],
    body: `Dear {applicant_name},\nWe are pleased to offer you the position of {job_title}.\n**Start Date:** {start_date}\n**Salary:** {salary}\nPlease confirm your acceptance.`,
  },
  {
    id: 7,
    name: "New Ticket Reply",
    module: "Support Ticket",
    subject: "New Reply on Ticket #{ticket_id}",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Ticket ID:", token: "{ticket_id}" },
      { label: "Customer Name:", token: "{customer_name}" },
      { label: "Reply Message:", token: "{reply_message}" },
    ],
    body: `Hello {customer_name},\nA new reply has been added to your ticket #{ticket_id}.\n{reply_message}\nView your ticket for the full response.`,
  },
  {
    id: 8,
    name: "New Ticket",
    module: "Support Ticket",
    subject: "Support Ticket Created - #{ticket_id}",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Ticket ID:", token: "{ticket_id}" },
      { label: "Customer Name:", token: "{customer_name}" },
      { label: "Subject:", token: "{subject}" },
    ],
    body: `Hello {customer_name},\nYour support ticket #{ticket_id} has been created successfully.\n**Subject:** {subject}\nWe will get back to you shortly.`,
  },
  {
    id: 9,
    name: "Lead Moved",
    module: "CRM",
    subject: "Lead Moved Notification",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Lead Name:", token: "{lead_name}" },
      { label: "New Stage:", token: "{new_stage}" },
    ],
    body: `Hello,\nThe lead {lead_name} has been moved to {new_stage}.\nPlease take appropriate action.`,
  },
  {
    id: 10,
    name: "Invoice Created",
    module: "Finance",
    subject: "Invoice #{invoice_number} Created",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Invoice Number:", token: "{invoice_number}" },
      { label: "Client Name:", token: "{client_name}" },
      { label: "Amount:", token: "{amount}" },
      { label: "Due Date:", token: "{due_date}" },
    ],
    body: `Dear {client_name},\nYour invoice #{invoice_number} has been created.\n**Amount:** {amount}\n**Due Date:** {due_date}\nPlease review and process payment.`,
  },
  {
    id: 11,
    name: "Invoice Sent",
    module: "Finance",
    subject: "Invoice #{invoice_number} Sent",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Invoice Number:", token: "{invoice_number}" },
      { label: "Client Name:", token: "{client_name}" },
      { label: "Amount:", token: "{amount}" },
    ],
    body: `Dear {client_name},\nInvoice #{invoice_number} for {amount} has been sent.\nPlease process payment at your earliest convenience.`,
  },
  {
    id: 12,
    name: "Payment Received",
    module: "Finance",
    subject: "Payment Received - #{invoice_number}",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Client Name:", token: "{client_name}" },
      { label: "Amount:", token: "{amount}" },
      { label: "Payment Date:", token: "{payment_date}" },
    ],
    body: `Dear {client_name},\nWe have received your payment of {amount} on {payment_date}.\nThank you for your prompt payment.`,
  },
  {
    id: 13,
    name: "Task Assigned",
    module: "Project",
    subject: "New Task Assigned to You",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Task Name:", token: "{task_name}" },
      { label: "Assignee Name:", token: "{assignee_name}" },
      { label: "Project Name:", token: "{project_name}" },
      { label: "Due Date:", token: "{due_date}" },
    ],
    body: `Hello {assignee_name},\nA new task has been assigned to you.\n**Task:** {task_name}\n**Project:** {project_name}\n**Due Date:** {due_date}`,
  },
  {
    id: 14,
    name: "Project Created",
    module: "Project",
    subject: "New Project: {project_name}",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Project Name:", token: "{project_name}" },
      { label: "Start Date:", token: "{start_date}" },
      { label: "End Date:", token: "{end_date}" },
    ],
    body: `Hello,\nA new project {project_name} has been created.\n**Start Date:** {start_date}\n**End Date:** {end_date}\nPlease review the project details.`,
  },
  {
    id: 15,
    name: "Meeting Scheduled",
    module: "CRM",
    subject: "Meeting Scheduled: {meeting_title}",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Meeting Title:", token: "{meeting_title}" },
      { label: "Meeting Date:", token: "{meeting_date}" },
      { label: "Meeting Time:", token: "{meeting_time}" },
    ],
    body: `Hello,\nA meeting has been scheduled.\n**Title:** {meeting_title}\n**Date:** {meeting_date}\n**Time:** {meeting_time}\nPlease confirm your attendance.`,
  },
  {
    id: 16,
    name: "Contract Signed",
    module: "Contracts",
    subject: "Contract Signed - {contract_name}",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Contract Name:", token: "{contract_name}" },
      { label: "Client Name:", token: "{client_name}" },
      { label: "Sign Date:", token: "{sign_date}" },
    ],
    body: `Dear {client_name},\nThe contract {contract_name} has been successfully signed on {sign_date}.\nThank you for completing the contract process.`,
  },
  {
    id: 17,
    name: "Contract Expiry",
    module: "Contracts",
    subject: "Contract Expiring Soon - {contract_name}",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Contract Name:", token: "{contract_name}" },
      { label: "Expiry Date:", token: "{expiry_date}" },
      { label: "Client Name:", token: "{client_name}" },
    ],
    body: `Hello,\nThe contract {contract_name} with {client_name} is expiring on {expiry_date}.\nPlease take action to renew or close the contract.`,
  },
  {
    id: 18,
    name: "Employee Onboarding",
    module: "HR",
    subject: "Welcome to {company_name}!",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Employee Name:", token: "{employee_name}" },
      { label: "Company Name:", token: "{company_name}" },
      { label: "Start Date:", token: "{start_date}" },
    ],
    body: `Dear {employee_name},\nWelcome to {company_name}! We are excited to have you join us.\n**Start Date:** {start_date}\nYour manager will reach out with further onboarding details.`,
  },
  {
    id: 19,
    name: "Leave Approved",
    module: "HR",
    subject: "Leave Request Approved",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Employee Name:", token: "{employee_name}" },
      { label: "Leave From:", token: "{leave_from}" },
      { label: "Leave To:", token: "{leave_to}" },
    ],
    body: `Dear {employee_name},\nYour leave request from {leave_from} to {leave_to} has been approved.\nEnjoy your time off!`,
  },
  {
    id: 20,
    name: "Leave Rejected",
    module: "HR",
    subject: "Leave Request Rejected",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Employee Name:", token: "{employee_name}" },
      { label: "Reason:", token: "{reason}" },
    ],
    body: `Dear {employee_name},\nWe regret to inform you that your leave request has been rejected.\n**Reason:** {reason}\nPlease contact HR for further clarification.`,
  },
  {
    id: 21,
    name: "Password Reset",
    module: "System",
    subject: "Reset Your Password",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "User Name:", token: "{user_name}" },
      { label: "Reset Link:", token: "{reset_link}" },
      { label: "Expiry Time:", token: "{expiry_time}" },
    ],
    body: `Dear {user_name},\nWe received a request to reset your password.\nClick the link below to reset it:\n{reset_link}\nThis link expires in {expiry_time}.`,
  },
  {
    id: 22,
    name: "Account Created",
    module: "System",
    subject: "Welcome! Your Account is Ready",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "User Name:", token: "{user_name}" },
      { label: "Email:", token: "{email}" },
      { label: "Password:", token: "{password}" },
    ],
    body: `Dear {user_name},\nYour account has been created successfully.\n**Email:** {email}\n**Password:** {password}\nPlease login and change your password immediately.`,
  },
  {
    id: 23,
    name: "Ticket Closed",
    module: "Support Ticket",
    subject: "Ticket #{ticket_id} Closed",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Ticket ID:", token: "{ticket_id}" },
      { label: "Customer Name:", token: "{customer_name}" },
      { label: "Resolution:", token: "{resolution}" },
    ],
    body: `Dear {customer_name},\nYour support ticket #{ticket_id} has been closed.\n**Resolution:** {resolution}\nIf you need further assistance, please open a new ticket.`,
  },
  {
    id: 24,
    name: "Estimate Sent",
    module: "Finance",
    subject: "Estimate #{estimate_number} Sent",
    fromName: "ERPGo",
    variables: [
      { label: "App Url:", token: "{app_url}" },
      { label: "Estimate Number:", token: "{estimate_number}" },
      { label: "Client Name:", token: "{client_name}" },
      { label: "Amount:", token: "{amount}" },
      { label: "Valid Until:", token: "{valid_until}" },
    ],
    body: `Dear {client_name},\nPlease find attached estimate #{estimate_number}.\n**Amount:** {amount}\n**Valid Until:** {valid_until}\nPlease review and let us know if you have any questions.`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SortIcon = () => (
  <span className="inline-flex flex-col ml-1 text-gray-400">
    <ChevronUp className="w-3 h-3 -mb-0.5" />
    <ChevronDown className="w-3 h-3" />
  </span>
);

// ─── Rich Toolbar ─────────────────────────────────────────────────────────────

const RichToolbar: React.FC = () => {
  const btn = "p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors";
  const ic = "w-3.5 h-3.5";
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 border-b border-gray-200 bg-white">
      <button className={btn}>
        <Bold className={ic} />
      </button>
      <button className={btn}>
        <Italic className={ic} />
      </button>
      <button className={btn}>
        <Underline className={ic} />
      </button>
      <button className={btn}>
        <Strikethrough className={ic} />
      </button>
      <button className={btn}>
        <Highlighter className={ic} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button className={btn}>
        <AlignLeft className={ic} />
      </button>
      <button className={btn}>
        <AlignCenter className={ic} />
      </button>
      <button className={btn}>
        <AlignRight className={ic} />
      </button>
      <button className={btn}>
        <AlignJustify className={ic} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button className={btn}>
        <List className={ic} />
      </button>
      <button className={btn}>
        <ListOrdered className={ic} />
      </button>
      <button className={btn}>
        <Quote className={ic} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button className={btn}>
        <Link2 className={ic} />
      </button>
      <button className="w-5 h-5 rounded bg-black flex-shrink-0 mx-0.5" />
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button className={btn}>
        <Undo2 className={ic} />
      </button>
      <button className={btn}>
        <Redo2 className={ic} />
      </button>
    </div>
  );
};

// ─── Edit Email Template ──────────────────────────────────────────────────────

const EditEmailTemplate: React.FC<{
  template: EmailTemplate;
  onBack: () => void;
}> = ({ template, onBack }) => {
  const [name, setName] = useState(template.name);
  const [fromName, setFrom] = useState(template.fromName);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);

  // Render body with bold-style for **text** markers
  const renderBody = (text: string) =>
    text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*|\[View Deal\])/g);
      return (
        <div key={i} className={line === "" ? "h-3" : ""}>
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**"))
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            if (part === "[View Deal]")
              return (
                <span
                  key={j}
                  className="text-blue-600 underline cursor-pointer"
                >
                  {" "}
                  View Deal
                </span>
              );
            return <span key={j}>{part}</span>;
          })}
        </div>
      );
    });

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer" onClick={onBack}>
            Dashboard
          </span>
          <span className="text-gray-400">›</span>
          <span className="hover:text-gray-700 cursor-pointer" onClick={onBack}>
            Email Templates
          </span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">Edit Email Template</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
          <Globe className="w-4 h-4" />
          <span>en English</span>
        </div>
      </div>

      {/* Page title + Back */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Edit Email Template : {template.name}
        </h1>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Split layout */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-5 items-start">
          {/* ── Left Column ── */}
          <div className="w-72 flex-shrink-0 space-y-5">
            {/* Variables */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Variables
              </h3>
              <div className="space-y-2.5">
                {template.variables.map((v, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-sm">
                    <span className="text-gray-700 flex-shrink-0">
                      {v.label}
                    </span>
                    <button
                      onClick={() => setBody((prev) => prev + " " + v.token)}
                      className="text-emerald-500 hover:text-emerald-600 font-mono text-xs transition-colors"
                    >
                      {v.token}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Template Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    From Name
                  </label>
                  <input
                    value={fromName}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <button className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium transition-colors">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span className="text-xs font-bold text-gray-500 border border-gray-300 rounded px-1.5 py-0.5">
                  GB
                </span>
                Content for English
              </div>
              <div className="relative">
                <select className="appearance-none border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-sm bg-white outline-none">
                  <option>English</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Spanish</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              {/* Email Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Message
                </label>
                <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-emerald-500">
                  <RichToolbar />
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setBody(e.currentTarget.innerText)}
                    className="min-h-64 px-4 py-3 text-sm text-gray-800 outline-none leading-relaxed"
                  >
                    {renderBody(body)}
                  </div>
                </div>
              </div>

              {/* Save Changes bottom */}
              <div className="flex justify-end pt-2">
                <button className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium transition-colors">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Email Templates List ─────────────────────────────────────────────────────

const EmailTemplatesList: React.FC<{ onEdit: (t: EmailTemplate) => void }> = ({
  onEdit,
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.module.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer">Dashboard</span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">Email Templates</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
          <Globe className="w-4 h-4" />
          <span>en English</span>
        </div>
      </div>

      {/* Page title */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <h1 className="text-xl font-semibold text-gray-900">
          Manage Email Templates
        </h1>
      </div>

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
                placeholder="Search email templates..."
                className="px-3 py-2 text-sm outline-none w-56"
              />
            </div>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium transition-colors">
              Search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select className="appearance-none border border-gray-200 rounded-md pl-3 pr-8 py-2 text-sm bg-white text-gray-700 outline-none cursor-pointer">
                <option>10 per page</option>
                <option>25 per page</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" /> Filters{" "}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Name <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Module <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 text-gray-900 text-sm">
                    {t.name}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {t.module}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onEdit(t)}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No templates found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
              {Math.min(page * perPage, filtered.length)} of {filtered.length}{" "}
              results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded transition-colors ${p === page ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

export const EmailTemplates: React.FC = () => {
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null,
  );

  if (editingTemplate) {
    return (
      <EditEmailTemplate
        template={editingTemplate}
        onBack={() => setEditingTemplate(null)}
      />
    );
  }
  return <EmailTemplatesList onEdit={(t) => setEditingTemplate(t)} />;
};

export default EmailTemplates;
