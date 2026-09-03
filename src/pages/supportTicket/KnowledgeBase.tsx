/**
 * File: src/pages/support/KnowledgeBase.tsx
 * Manage Knowledge Base:
 *   - List with Title (sortable), Category, Description (truncated), Created (sortable), Actions
 *   - Search + Filters button + 10-per-page selector
 *   - Upload icon + green + button in header
 *   - Edit modal: Title (required), Category dropdown (required), Description rich editor
 *   - Add modal: same fields, empty
 *   - Delete confirmation
 *   - Pagination: Previous / numbered / Next
 */

import React, { useState } from "react";
import {
  Globe,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Upload,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

interface KbArticle {
  id: number;
  title: string;
  category: string;
  description: string;
  created: string;
}

type ModalMode = "add" | "edit" | null;

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  "FAQ & Common Questions",
  "User Training Resources",
  "Security Best Practices",
  "Performance Optimization",
  "Third-Party Integrations",
  "Billing & Payment",
  "Account Management",
  "Technical Support",
];

// ─── Sample Data ──────────────────────────────────────────────────────────────

const initialArticles: KbArticle[] = [
  {
    id: 1,
    title: "Customer Self-Service Portal and FAQ Optimization",
    category: "FAQ & Common Questions",
    description:
      "Self-Service ExcellenceOptimize your customer self-service portal with intuitive navigation, comprehensive FAQ sections, and interactive troubleshooting guides. Learn how to reduce support ticket volume by empowering customers to find solutions independently through well-designed self-service resources.\nPortal Design\nCreate user-friendly interfaces that guide customers to relevant information quickly and efficiently.\nFAQ Optimization\nRegularly update FAQ content based on support ticket trends and customer feedback for maximum effectiveness.",
    created: "2026-02-03 12:32",
  },
  {
    id: 2,
    title: "Knowledge Base Management and Content Strategy",
    category: "FAQ & Common Questions",
    description:
      "Content Management ExcellenceDevelop and maintain an effective knowledge base with strategic content planning, regular updates, and comprehensive coverage of customer needs. Learn best practices for organizing, categorizing, and presenting information.",
    created: "2026-01-22 12:32",
  },
  {
    id: 3,
    title: "Advanced Workflow Automation and Customization",
    category: "User Training Resources",
    description:
      "Workflow Automation MasteryMaster advanced workflow automation including custom triggers, conditional logic, and automated response systems. Streamline your support operations with intelligent automation.",
    created: "2025-12-27 12:32",
  },
  {
    id: 4,
    title: "Comprehensive Training Program and Certification",
    category: "User Training Resources",
    description:
      "Professional Development ProgramAccess our comprehensive training program including video tutorials, hands-on exercises, and certification pathways for support professionals.",
    created: "2025-12-20 12:32",
  },
  {
    id: 5,
    title: "Access Control and Authentication Systems",
    category: "Security Best Practices",
    description:
      "Advanced Authentication SetupConfigure multi-factor authentication, single sign-on integration, and role-based access control to ensure secure access to your support platform.",
    created: "2025-12-08 12:32",
  },
  {
    id: 6,
    title: "Data Security and Compliance Framework",
    category: "Security Best Practices",
    description:
      "Comprehensive Security ImplementationImplement robust security measures including data encryption, audit logging, and compliance frameworks to protect sensitive customer information.",
    created: "2025-12-01 12:32",
  },
  {
    id: 7,
    title: "Database Optimization and Scaling Strategies",
    category: "Performance Optimization",
    description:
      "Enterprise Performance ScalingOptimize database performance for high-volume support operations with indexing strategies, query optimization, and horizontal scaling techniques.",
    created: "2025-11-23 12:32",
  },
  {
    id: 8,
    title: "System Performance Monitoring and Optimization",
    category: "Performance Optimization",
    description:
      "Performance Monitoring DashboardMonitor system performance with comprehensive analytics including response time tracking, resource utilization, and automated alerting systems.",
    created: "2025-11-16 12:32",
  },
  {
    id: 9,
    title: "Slack and Microsoft Teams Integration",
    category: "Third-Party Integrations",
    description:
      "Communication Platform IntegrationConnect your support system with Slack and Microsoft Teams for seamless team collaboration and real-time ticket notifications.",
    created: "2025-11-03 12:32",
  },
  {
    id: 10,
    title: "API Integration and Webhook Configuration",
    category: "Third-Party Integrations",
    description:
      "API Integration GuideIntegrate your applications with our comprehensive REST API and webhook system for automated data synchronization and event-driven workflows.",
    created: "2025-10-27 12:32",
  },
  {
    id: 11,
    title: "Billing and Subscription Management",
    category: "Billing & Payment",
    description:
      "Billing ExcellenceManage customer billing cycles, subscription upgrades, and payment processing with automated invoicing and dunning management systems.",
    created: "2025-10-20 12:32",
  },
  {
    id: 12,
    title: "Multi-Channel Support Setup Guide",
    category: "Technical Support",
    description:
      "Omnichannel Support ConfigurationSet up email, chat, phone, and social media support channels in one unified platform for consistent customer experience.",
    created: "2025-10-13 12:32",
  },
  {
    id: 13,
    title: "Customer Account Management Best Practices",
    category: "Account Management",
    description:
      "Account Management ExcellenceMaster customer account lifecycle management including onboarding, upgrades, renewals, and churn prevention strategies.",
    created: "2025-10-06 12:32",
  },
  {
    id: 14,
    title: "Reporting and Analytics Dashboard Configuration",
    category: "Performance Optimization",
    description:
      "Analytics MasteryBuild comprehensive reporting dashboards with real-time metrics, custom KPIs, and automated report delivery for data-driven support decisions.",
    created: "2025-09-29 12:32",
  },
  {
    id: 15,
    title: "Email Template Design and Automation",
    category: "User Training Resources",
    description:
      "Email Automation ExcellenceDesign professional email templates and automate customer communications with conditional logic, personalization tokens, and A/B testing.",
    created: "2025-09-22 12:32",
  },
  {
    id: 16,
    title: "SLA Management and Escalation Policies",
    category: "Technical Support",
    description:
      "SLA ExcellenceConfigure service level agreements, escalation rules, and breach notifications to ensure timely resolution and customer satisfaction.",
    created: "2025-09-15 12:32",
  },
  {
    id: 17,
    title: "CRM Integration and Data Synchronization",
    category: "Third-Party Integrations",
    description:
      "CRM IntegrationSync customer data between your support platform and CRM system for unified customer profiles and complete interaction history.",
    created: "2025-09-08 12:32",
  },
  {
    id: 18,
    title: "AI-Powered Chatbot Configuration",
    category: "FAQ & Common Questions",
    description:
      "AI Chatbot SetupDeploy and configure AI-powered chatbots to handle common customer inquiries, reduce support workload, and provide 24/7 automated assistance.",
    created: "2025-09-01 12:32",
  },
  {
    id: 19,
    title: "Mobile App Support Configuration",
    category: "Technical Support",
    description:
      "Mobile Support SetupConfigure mobile-optimized support interfaces, push notifications, and in-app help features for seamless mobile customer support.",
    created: "2025-08-25 12:32",
  },
  {
    id: 20,
    title: "Password Policy and User Security Training",
    category: "Security Best Practices",
    description:
      "Security AwarenessTrain users on strong password policies, phishing prevention, and security best practices to maintain a secure support environment.",
    created: "2025-08-18 12:32",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncate = (text: string, len = 110) =>
  text.length > len ? text.slice(0, len) + "..." : text;

const SortIcon = () => (
  <span className="inline-flex flex-col ml-1 text-gray-400">
    <ChevronUp className="w-3 h-3 -mb-0.5" />
    <ChevronDown className="w-3 h-3" />
  </span>
);

// ─── Rich Toolbar (decorative) ────────────────────────────────────────────────

const RichToolbar: React.FC = () => {
  const btn = "p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors";
  const ic = "w-3.5 h-3.5";
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-white">
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
      <button
        className={`${btn} !p-0 w-5 h-5 rounded bg-black flex items-center justify-center`}
      />
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

// ─── Edit / Add Modal ─────────────────────────────────────────────────────────

interface ModalProps {
  mode: ModalMode;
  article: KbArticle | null;
  onClose: () => void;
  onSave: (data: Partial<KbArticle>) => void;
}

const KbModal: React.FC<ModalProps> = ({ mode, article, onClose, onSave }) => {
  const [title, setTitle] = useState(article?.title ?? "");
  const [category, setCategory] = useState(article?.category ?? "");
  const [description, setDescription] = useState(article?.description ?? "");

  if (!mode) return null;

  const handleSubmit = () => {
    if (!title.trim() || !category || !description.trim()) return;
    onSave({ title: title.trim(), category, description: description.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "edit" ? "Edit Knowledge Base" : "Add Knowledge Base"}
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
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-emerald-500 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
              placeholder="Enter title"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-white appearance-none"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-emerald-500">
              <RichToolbar />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={9}
                className="w-full px-3 py-2.5 text-sm outline-none resize-none leading-relaxed"
                placeholder="Enter description..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium"
          >
            {mode === "edit" ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

const DeleteModal: React.FC<{
  article: KbArticle | null;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ article, onClose, onConfirm }) => {
  if (!article) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Delete Article
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">"{article.title}"</span>?
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

export const KnowledgeBase: React.FC = () => {
  const [articles, setArticles] = useState<KbArticle[]>(initialArticles);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingArticle, setEditingArticle] = useState<KbArticle | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<KbArticle | null>(
    null,
  );

  // Filter
  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditingArticle(null);
    setModalMode("add");
  };

  const openEdit = (article: KbArticle) => {
    setEditingArticle(article);
    setModalMode("edit");
  };

  const handleSave = (data: Partial<KbArticle>) => {
    if (modalMode === "add") {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const created = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setArticles((prev) => [
        {
          id: Date.now(),
          title: data.title!,
          category: data.category!,
          description: data.description!,
          created,
        },
        ...prev,
      ]);
    } else if (modalMode === "edit" && editingArticle) {
      setArticles((prev) =>
        prev.map((a) => (a.id === editingArticle.id ? { ...a, ...data } : a)),
      );
    }
    setPage(1);
  };

  const handleDelete = () => {
    if (!deletingArticle) return;
    setArticles((prev) => prev.filter((a) => a.id !== deletingArticle.id));
    setDeletingArticle(null);
    if (page > Math.ceil((filtered.length - 1) / perPage)) {
      setPage((p) => Math.max(1, p - 1));
    }
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer">Dashboard</span>
          <span className="text-gray-400">›</span>
          <span className="hover:text-gray-700 cursor-pointer">
            Support Tickets
          </span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">Knowledge Base</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
          <Globe className="w-4 h-4" />
          <span>en English</span>
        </div>
      </div>

      {/* Page title */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Manage Knowledge Base
        </h1>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
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
                placeholder="Search knowledge base..."
                className="px-3 py-2 text-sm outline-none w-52"
              />
            </div>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium">
              Search
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select className="appearance-none border border-gray-200 rounded-md pl-3 pr-8 py-2 text-sm bg-white text-gray-700 outline-none cursor-pointer">
                <option>10 per page</option>
                <option>25 per page</option>
                <option>50 per page</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Title <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Created <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((article) => (
                <tr
                  key={article.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3.5 text-gray-900 text-sm font-medium w-56 max-w-[200px]">
                    {article.title}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                    {article.category}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm max-w-xl">
                    {truncate(article.description)}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                    {article.created}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(article)}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingArticle(article)}
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
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No articles found matching your search.
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
      <KbModal
        mode={modalMode}
        article={editingArticle}
        onClose={() => {
          setModalMode(null);
          setEditingArticle(null);
        }}
        onSave={handleSave}
      />
      <DeleteModal
        article={deletingArticle}
        onClose={() => setDeletingArticle(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default KnowledgeBase;
