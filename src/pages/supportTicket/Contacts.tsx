/**
 * File: src/pages/support/ManageContact.tsx
 * Manage Contact:
 *   - List: Name (sortable), Email (sortable), Subject (sortable),
 *           Message (truncated), Date (sortable), Actions (view eye + delete trash)
 *   - Search + 10-per-page selector (no Filters, no + button in toolbar)
 *   - No Upload / Add button in page header either — read-only contact submissions
 *   - View modal: shows full contact details
 *   - Delete confirmation modal
 *   - Pagination: Previous / numbered / Next
 */

import React, { useState } from "react";
import {
  Globe,
  Search,
  Eye,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Tag,
  MessageSquare,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactItem {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const initialContacts: ContactItem[] = [
  {
    id: 1,
    name: "Lauren Thompson",
    email: "lauren.thompson@contact.com",
    subject: "Pricing and Implementation Timeline",
    message:
      "We are finalizing our vendor selection and need detailed pricing information along with a realistic implementation timeline for your enterprise support platform. Our team of 200+ agents requires a seamless migration from our current system.",
    date: "2026-02-06 12:32",
  },
  {
    id: 2,
    name: "Ryan Anderson",
    email: "ryan.anderson@contact.com",
    subject: "API Documentation and Developer Resources",
    message:
      "Our development team needs comprehensive API documentation and developer resources to integrate your support system with our existing infrastructure. We require REST API access, webhook support, and detailed SDK documentation.",
    date: "2026-01-27 12:32",
  },
  {
    id: 3,
    name: "Jessica Martinez",
    email: "jessica.martinez@contact.com",
    subject: "Custom Branding and White-Label Solutions",
    message:
      "We need a white-label solution with custom branding capabilities including our company logo, color scheme, and domain name. Our clients expect a fully branded support experience that matches our corporate identity.",
    date: "2026-01-20 12:32",
  },
  {
    id: 4,
    name: "William Roberts",
    email: "william.roberts@contact.com",
    subject: "Data Migration and System Integration",
    message:
      "We are migrating from our current support system and need assistance with data migration, including historical tickets, customer records, and knowledge base articles. We also require integration with Salesforce and our internal ERP system.",
    date: "2026-01-01 12:32",
  },
  {
    id: 5,
    name: "Samantha Evans",
    email: "samantha.evans@contact.com",
    subject: "Mobile Application and Remote Access",
    message:
      "Our support team requires mobile access for ticket management and customer communication. Please provide information about your mobile application features, offline capabilities, and cross-platform compatibility.",
    date: "2025-12-24 12:32",
  },
  {
    id: 6,
    name: "Anthony Parker",
    email: "anthony.parker@contact.com",
    subject: "Enterprise Deployment and Scalability",
    message:
      "We are planning an enterprise deployment for 500+ concurrent agents across multiple geographic locations. We need detailed information about scalability, load balancing, and high availability configurations for our global operations.",
    date: "2025-12-17 12:32",
  },
  {
    id: 7,
    name: "Michelle Campbell",
    email: "michelle.campbell@contact.com",
    subject: "Customer Portal and Self-Service Options",
    message:
      "We want to implement a comprehensive customer portal with self-service capabilities including ticket submission, status tracking, knowledge base access, and community forums. Please share your portal customization options.",
    date: "2025-12-03 12:32",
  },
  {
    id: 8,
    name: "Daniel Phillips",
    email: "daniel.phillips@contact.com",
    subject: "Automated Workflow and Escalation Rules",
    message:
      "We need sophisticated automation including ticket routing, priority escalation, SLA management, and automated response templates. Please provide details about your workflow builder and automation capabilities.",
    date: "2025-11-26 12:32",
  },
  {
    id: 9,
    name: "Elizabeth Turner",
    email: "elizabeth.turner@contact.com",
    subject: "Multi-Language Support Requirements",
    message:
      "Our global customer base requires multi-language support across 15 different languages. We need information about your localization capabilities, right-to-left language support, and translation management features.",
    date: "2025-11-21 12:32",
  },
  {
    id: 10,
    name: "Matthew Stewart",
    email: "matthew.stewart@contact.com",
    subject: "Knowledge Base Management System",
    message:
      "We need a robust knowledge base system with article versioning, category management, search optimization, and analytics. Please share information about content management workflows and SEO capabilities.",
    date: "2025-11-13 12:32",
  },
  {
    id: 11,
    name: "Sarah Johnson",
    email: "sarah.johnson@contact.com",
    subject: "SLA Configuration and Compliance Reporting",
    message:
      "We require detailed SLA configuration options with custom response times by priority, department, and customer tier. We also need comprehensive compliance reporting for our ISO 27001 certification requirements.",
    date: "2025-11-05 12:32",
  },
  {
    id: 12,
    name: "Christopher Lee",
    email: "christopher.lee@contact.com",
    subject: "AI and Machine Learning Features",
    message:
      "We are interested in AI-powered features including automated ticket classification, sentiment analysis, suggested responses, and predictive analytics. Please provide information about your AI capabilities and roadmap.",
    date: "2025-10-28 12:32",
  },
  {
    id: 13,
    name: "Amanda Wilson",
    email: "amanda.wilson@contact.com",
    subject: "Security and Compliance Requirements",
    message:
      "Our organization requires SOC 2 Type II compliance, GDPR data handling, end-to-end encryption, and detailed audit logging. Please provide your security documentation and compliance certificates.",
    date: "2025-10-20 12:32",
  },
  {
    id: 14,
    name: "David Garcia",
    email: "david.garcia@contact.com",
    subject: "Reporting and Analytics Dashboard",
    message:
      "We need advanced reporting capabilities including real-time dashboards, custom KPI tracking, agent performance metrics, and automated report scheduling. Can you demonstrate your analytics capabilities?",
    date: "2025-10-12 12:32",
  },
  {
    id: 15,
    name: "Jennifer Martinez",
    email: "jennifer.martinez@contact.com",
    subject: "Training and Onboarding Program",
    message:
      "We need a comprehensive training and onboarding program for our 300 support agents. Please provide information about your training resources, certification programs, and dedicated customer success support.",
    date: "2025-10-04 12:32",
  },
  {
    id: 16,
    name: "Robert Taylor",
    email: "robert.taylor@contact.com",
    subject: "Integration with Existing Tech Stack",
    message:
      "We use a complex tech stack including Jira, Confluence, Slack, Microsoft Teams, and various internal tools. We need comprehensive integration support and custom webhook capabilities to connect all systems.",
    date: "2025-09-26 12:32",
  },
  {
    id: 17,
    name: "Lisa Anderson",
    email: "lisa.anderson@contact.com",
    subject: "Customer Satisfaction Surveys and Feedback",
    message:
      "We want to implement automated customer satisfaction surveys, NPS tracking, and feedback collection mechanisms. Please share information about your survey tools and customer feedback analytics.",
    date: "2025-09-18 12:32",
  },
  {
    id: 18,
    name: "James Brown",
    email: "james.brown@contact.com",
    subject: "Multi-Channel Support Setup",
    message:
      "We need unified multi-channel support covering email, live chat, phone, social media, and in-app messaging. Please provide details about your omnichannel capabilities and channel management features.",
    date: "2025-09-10 12:32",
  },
  {
    id: 19,
    name: "Patricia Davis",
    email: "patricia.davis@contact.com",
    subject: "Billing and Subscription Management",
    message:
      "We need detailed information about billing options, subscription tiers, volume discounts for enterprise accounts, and flexible payment terms. Please connect us with your enterprise sales team.",
    date: "2025-09-02 12:32",
  },
  {
    id: 20,
    name: "Kevin White",
    email: "kevin.white@contact.com",
    subject: "System Uptime and Disaster Recovery",
    message:
      "Our business requires 99.99% uptime guarantee, automatic failover, disaster recovery procedures, and detailed incident response protocols. Please provide your SLA documentation and uptime history.",
    date: "2025-08-25 12:32",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncate = (text: string, len = 65) =>
  text.length > len ? text.slice(0, len) + "..." : text;

const SortIcon = () => (
  <span className="inline-flex flex-col ml-1 text-gray-400">
    <ChevronUp className="w-3 h-3 -mb-0.5" />
    <ChevronDown className="w-3 h-3" />
  </span>
);

// ─── View Modal ───────────────────────────────────────────────────────────────

const ViewModal: React.FC<{
  contact: ContactItem | null;
  onClose: () => void;
}> = ({ contact, onClose }) => {
  if (!contact) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            Contact Details
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-0.5">
              {contact.name.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 mb-0.5">
                Name
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {contact.name}
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mail className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 mb-0.5">
                Email
              </div>
              <div className="text-sm text-gray-900">{contact.email}</div>
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Tag className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 mb-0.5">
                Subject
              </div>
              <div className="text-sm font-medium text-gray-900">
                {contact.subject}
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 mb-0.5">
                Date
              </div>
              <div className="text-sm text-gray-900">{contact.date}</div>
            </div>
          </div>

          {/* Message */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-400 mb-0.5">
                Message
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {contact.message}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirmation ──────────────────────────────────────────────────────

const DeleteModal: React.FC<{
  contact: ContactItem | null;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ contact, onClose, onConfirm }) => {
  if (!contact) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Delete Contact
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete the contact from{" "}
          <span className="font-medium text-gray-900">"{contact.name}"</span>?
          This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Contact: React.FC = () => {
  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [viewingContact, setViewingContact] = useState<ContactItem | null>(
    null,
  );
  const [deletingContact, setDeletingContact] = useState<ContactItem | null>(
    null,
  );

  // Filter
  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.message.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = () => {
    if (!deletingContact) return;
    setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id));
    setDeletingContact(null);
    const newTotal = filtered.length - 1;
    if (page > Math.ceil(newTotal / perPage)) {
      setPage((p) => Math.max(1, p - 1));
    }
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      {/* Breadcrumb header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer transition-colors">
            Dashboard
          </span>
          <span className="text-gray-400">›</span>
          <span className="hover:text-gray-700 cursor-pointer transition-colors">
            Support Tickets
          </span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">Contact</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
          <Globe className="w-4 h-4" />
          <span>en English</span>
        </div>
      </div>

      {/* Page title — no buttons, matching screenshot */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <h1 className="text-xl font-semibold text-gray-900">Manage Contact</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
              <Search className="w-4 h-4 text-gray-400 ml-3" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search contacts..."
                className="px-3 py-2 text-sm outline-none w-52"
              />
            </div>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium">
              Search
            </button>
          </div>

          {/* Per page — right side only */}
          <div className="relative">
            <select className="appearance-none border border-gray-200 rounded-md pl-3 pr-8 py-2 text-sm bg-white text-gray-700 outline-none cursor-pointer">
              <option>10 per page</option>
              <option>25 per page</option>
              <option>50 per page</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Name <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Email <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Subject <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Date <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3.5 text-gray-900 text-sm font-medium whitespace-nowrap">
                    {contact.name}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                    {contact.email}
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 text-sm">
                    {contact.subject}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {truncate(contact.message)}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                    {contact.date}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingContact(contact)}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingContact(contact)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No contacts found matching your search.
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
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded transition-colors ${
                    p === page
                      ? "bg-emerald-500 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ViewModal
        contact={viewingContact}
        onClose={() => setViewingContact(null)}
      />
      <DeleteModal
        contact={deletingContact}
        onClose={() => setDeletingContact(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Contact;
