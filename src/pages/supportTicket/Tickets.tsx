/**
 * File: src/pages/support/SupportTickets.tsx
 * Support Tickets Module:
 *   - ManageTickets: list with No, Ticket ID, Account Type, Name+email, Subject,
 *                    Category, Status badge, Created, Actions (view/edit/delete)
 *                    + search, Filters button, list/grid toggle, per-page selector
 *   - EditReply:     left split – ticket header, conversation thread, add reply
 *                    (rich toolbar + attachments + Send Reply);
 *                    right split – Ticket Info panel, Customer Info panel, Internal Note panel
 *   - PublicView:    public-facing ticket page with teal navbar, dot-grid background,
 *                    ticket summary card, conversation thread, closed-notice
 *                    + Ticket Information sidebar
 */

import React, { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { api } from "@/lib/api/client";
import { toArray } from "@/services/_http";
import { db } from "@/lib/db";
import { showToast } from "../../utils/toast";
import {
  Globe,
  Plus,
  X,
  Search,
  List,
  Grid3X3,
  ChevronUp,
  ChevronDown,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
  Clock,
  Tag,
  User,
  Info,
  MessageSquare,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List as ListIcon,
  ListOrdered,
  Quote,
  Link2,
  Undo2,
  Redo2,
  ChevronDown as ChevronDownIcon,
  Save,
  Send,
  Headphones,
  LayoutList,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = "Closed" | "In Progress" | "On Hold" | "Open";
type AccountType = "staff" | "vendor" | "client";
type AppView = "list" | "edit" | "public";

interface Ticket {
  id: number;
  ticketId: string;
  accountType: AccountType;
  name: string;
  email: string;
  subject: string;
  category: string;
  status: TicketStatus;
  created: string;
  priority: string;
  updated: string;
  messages: Message[];
}

interface Message {
  id: number;
  author: string;
  role: string;
  email: string;
  time: string;
  body: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleTickets: Ticket[] = [
  {
    id: 1,
    ticketId: "1770791582",
    accountType: "staff",
    name: "Lauren Thompson",
    email: "lauren.thompson@email.com",
    subject: "System Architecture Scalability Planning",
    category: "General Inquiry",
    status: "Closed",
    created: "2026-02-01 13:59",
    priority: "Normal",
    updated: "2/11/2026",
    messages: [
      {
        id: 1,
        author: "Lauren Thompson",
        role: "Customer",
        email: "lauren.thompson@email.com",
        time: "2/1/2026, 1:59:23 PM",
        body: "Planning system architecture scalability for anticipated user growth. Need guidance on backend infrastructure scaling, load balancing configuration, and distributed system implementation strategies.",
      },
      {
        id: 2,
        author: "User",
        role: "Customer",
        email: "",
        time: "2/1/2026, 5:40:52 PM",
        body: "Thank you for your inquiry. We have provided comprehensive information about your request. Our sales team will follow up with details.",
      },
    ],
  },
  {
    id: 2,
    ticketId: "1770791581",
    accountType: "vendor",
    name: "Ryan Anderson",
    email: "ryan.anderson@email.com",
    subject: "Backend System Administration Training",
    category: "Training & Education",
    status: "Closed",
    created: "2026-01-20 15:00",
    priority: "Normal",
    updated: "1/25/2026",
    messages: [
      {
        id: 1,
        author: "Ryan Anderson",
        role: "Customer",
        email: "ryan.anderson@email.com",
        time: "1/20/2026, 3:00:00 PM",
        body: "We need comprehensive backend system administration training for our new team members.",
      },
      {
        id: 2,
        author: "User",
        role: "Customer",
        email: "",
        time: "1/21/2026, 9:00:00 AM",
        body: "We have scheduled a training session for your team. Please check the calendar invite.",
      },
    ],
  },
  {
    id: 3,
    ticketId: "1770791580",
    accountType: "client",
    name: "Jessica Martinez",
    email: "jessica.martinez@email.com",
    subject: "Backend Security Audit and Hardening",
    category: "Security Concerns",
    status: "In Progress",
    created: "2026-01-03 13:47",
    priority: "High",
    updated: "1/10/2026",
    messages: [
      {
        id: 1,
        author: "Jessica Martinez",
        role: "Customer",
        email: "jessica.martinez@email.com",
        time: "1/3/2026, 1:47:00 PM",
        body: "We require a complete security audit of our backend systems including penetration testing and vulnerability assessment.",
      },
    ],
  },
  {
    id: 4,
    ticketId: "1770791579",
    accountType: "staff",
    name: "William Roberts",
    email: "william.roberts@email.com",
    subject: "Query Optimization for Large Datasets",
    category: "Performance Issues",
    status: "On Hold",
    created: "2025-12-27 14:43",
    priority: "Normal",
    updated: "1/2/2026",
    messages: [
      {
        id: 1,
        author: "William Roberts",
        role: "Customer",
        email: "william.roberts@email.com",
        time: "12/27/2025, 2:43:00 PM",
        body: "Our database queries are taking too long for large datasets. Need optimization strategies.",
      },
    ],
  },
  {
    id: 5,
    ticketId: "1770791578",
    accountType: "vendor",
    name: "Samantha Evans",
    email: "samantha.evans@email.com",
    subject: "Enterprise SSO Integration Setup",
    category: "Integration Support",
    status: "In Progress",
    created: "2025-12-22 17:41",
    priority: "High",
    updated: "12/28/2025",
    messages: [
      {
        id: 1,
        author: "Samantha Evans",
        role: "Customer",
        email: "samantha.evans@email.com",
        time: "12/22/2025, 5:41:00 PM",
        body: "We need help setting up enterprise SSO integration with our existing identity provider.",
      },
    ],
  },
  {
    id: 6,
    ticketId: "1770791577",
    accountType: "client",
    name: "Anthony Parker",
    email: "anthony.parker@email.com",
    subject: "Multi-Tenant Architecture Implementation",
    category: "Account Management",
    status: "Closed",
    created: "2025-12-14 14:25",
    priority: "Normal",
    updated: "12/20/2025",
    messages: [
      {
        id: 1,
        author: "Anthony Parker",
        role: "Customer",
        email: "anthony.parker@email.com",
        time: "12/14/2025, 2:25:00 PM",
        body: "Looking for guidance on implementing multi-tenant architecture for our SaaS product.",
      },
    ],
  },
  {
    id: 7,
    ticketId: "1770791576",
    accountType: "staff",
    name: "Michelle Campbell",
    email: "michelle.campbell@email.com",
    subject: "Memory Leak in Background Processing",
    category: "Bug Report",
    status: "In Progress",
    created: "2025-12-06 13:34",
    priority: "Critical",
    updated: "12/15/2025",
    messages: [
      {
        id: 1,
        author: "Michelle Campbell",
        role: "Customer",
        email: "michelle.campbell@email.com",
        time: "12/6/2025, 1:34:00 PM",
        body: "Significant memory leak detected in our background job processing system. Application crashes after extended operation.",
      },
    ],
  },
  {
    id: 8,
    ticketId: "1770791575",
    accountType: "vendor",
    name: "Daniel Phillips",
    email: "daniel.phillips@email.com",
    subject: "Custom API Endpoint Development",
    category: "Feature Request",
    status: "On Hold",
    created: "2025-11-29 15:20",
    priority: "Normal",
    updated: "12/5/2025",
    messages: [
      {
        id: 1,
        author: "Daniel Phillips",
        role: "Customer",
        email: "daniel.phillips@email.com",
        time: "11/29/2025, 3:20:00 PM",
        body: "Requesting development of custom API endpoints for third-party integrations.",
      },
    ],
  },
  {
    id: 9,
    ticketId: "1770791574",
    accountType: "client",
    name: "Elizabeth Turner",
    email: "elizabeth.turner@email.com",
    subject: "Automated Billing System Configuration",
    category: "Billing & Payment",
    status: "In Progress",
    created: "2025-11-23 17:19",
    priority: "Normal",
    updated: "11/30/2025",
    messages: [
      {
        id: 1,
        author: "Elizabeth Turner",
        role: "Customer",
        email: "elizabeth.turner@email.com",
        time: "11/23/2025, 5:19:00 PM",
        body: "Need assistance configuring automated billing system for recurring subscriptions.",
      },
    ],
  },
  {
    id: 10,
    ticketId: "1770791573",
    accountType: "staff",
    name: "Matthew Stewart",
    email: "matthew.stewart@email.com",
    subject: "Database Connection Pool Optimization",
    category: "Technical Support",
    status: "In Progress",
    created: "2025-11-16 13:59",
    priority: "High",
    updated: "11/22/2025",
    messages: [
      {
        id: 1,
        author: "Matthew Stewart",
        role: "Customer",
        email: "matthew.stewart@email.com",
        time: "11/16/2025, 1:59:00 PM",
        body: "Database connection pool exhaustion causing application downtime during peak hours.",
      },
    ],
  },
  {
    id: 11,
    ticketId: "1770791572",
    accountType: "client",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    subject: "OAuth2 Implementation Issue",
    category: "Security Concerns",
    status: "Open",
    created: "2025-11-10 09:30",
    priority: "High",
    updated: "11/15/2025",
    messages: [
      {
        id: 1,
        author: "Sarah Johnson",
        role: "Customer",
        email: "sarah.johnson@email.com",
        time: "11/10/2025, 9:30:00 AM",
        body: "Having issues implementing OAuth2 authentication flow in our application.",
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<TicketStatus, { label: string; cls: string }> = {
  Closed: {
    label: "Closed",
    cls: "bg-red-100 text-red-600 border border-red-200",
  },
  "In Progress": {
    label: "In Progress",
    cls: "bg-blue-100 text-blue-600 border border-blue-200",
  },
  "On Hold": {
    label: "On Hold",
    cls: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  },
  Open: {
    label: "Open",
    cls: "bg-green-100 text-green-600 border border-green-200",
  },
};

const StatusBadge: React.FC<{ status: TicketStatus; size?: "sm" | "md" }> = ({
  status,
  size = "sm",
}) => {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
};

const SortIcon = () => (
  <span className="inline-flex flex-col ml-1 text-gray-400">
    <ChevronUp className="w-3 h-3 -mb-0.5" />
    <ChevronDown className="w-3 h-3" />
  </span>
);

const AppHeader: React.FC<{
  breadcrumbs: { label: string; onClick?: () => void }[];
}> = ({ breadcrumbs }) => (
  <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      {breadcrumbs.map((crumb, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-gray-400">›</span>}
          {crumb.onClick ? (
            <button
              onClick={crumb.onClick}
              className="hover:text-gray-700 transition-colors"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
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

// ─── Rich Text Toolbar (decorative) ──────────────────────────────────────────

const RichToolbar: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const btn = "p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors";
  const sz = compact ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div
      className={`flex items-center flex-wrap gap-0.5 p-2 border-b border-gray-200 bg-gray-50 ${compact ? "rounded-t-md" : ""}`}
    >
      <button className={btn}>
        <Bold className={sz} />
      </button>
      <button className={btn}>
        <Italic className={sz} />
      </button>
      <button className={btn}>
        <Underline className={sz} />
      </button>
      <button className={btn}>
        <Strikethrough className={sz} />
      </button>
      {!compact && (
        <button className={btn}>
          <Highlighter className={sz} />
        </button>
      )}
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button className={btn}>
        <AlignLeft className={sz} />
      </button>
      <button className={btn}>
        <AlignCenter className={sz} />
      </button>
      <button className={btn}>
        <AlignRight className={sz} />
      </button>
      <button className={btn}>
        <AlignJustify className={sz} />
      </button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button className={btn}>
        <ListIcon className={sz} />
      </button>
      <button className={btn}>
        <ListOrdered className={sz} />
      </button>
      {!compact && (
        <button className={btn}>
          <Quote className={sz} />
        </button>
      )}
      <button className={btn}>
        <Link2 className={sz} />
      </button>
      <button className={`${btn} w-5 h-5 rounded bg-black`} />
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button className={btn}>
        <Undo2 className={sz} />
      </button>
      <button className={btn}>
        <Redo2 className={sz} />
      </button>
    </div>
  );
};

// ─── 1. Manage Tickets ────────────────────────────────────────────────────────

/* ── persistence (Dexie meta row, seeded from the sample data) ──── */
const TICKETS_KEY = "st:tickets";
const ticketStore = {
  save: async (list: Ticket[]) => {
    await db.meta.put({ key: TICKETS_KEY, value: list });
  },
  use: (): Ticket[] | null | undefined =>
    useLiveQuery(async () => {
      const row = await db.meta.get(TICKETS_KEY);
      return row === undefined ? null : (row.value as Ticket[]);
    }, []),
};

const TICKET_CATEGORIES = [
  "General Inquiry", "Technical Support", "Billing & Payment", "Bug Report",
  "Feature Request", "Account Management", "Integration Support",
  "Performance Issues", "Security Concerns", "Training & Education",
];
const TICKET_PRIORITIES = ["Low", "Normal", "High", "Critical"];

const nowStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const CreateTicketModal: React.FC<{
  tickets: Ticket[];
  onClose: () => void;
}> = ({ tickets, onClose }) => {
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [priority, setPriority] = useState("Normal");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const create = async () => {
    if (!name.trim()) { showToast("Name is required", "error"); return; }
    if (!email.trim()) { showToast("Email is required", "error"); return; }
    if (!subject.trim()) { showToast("Subject is required", "error"); return; }
    const created = nowStamp();
    const ticket: Ticket = {
      id: Math.max(0, ...tickets.map((t) => t.id)) + 1,
      ticketId: String(Math.floor(Date.now() / 1000)),
      accountType,
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      category,
      status: "Open",
      created,
      updated: created,
      priority,
      messages: description.trim()
        ? [{ id: 1, author: name.trim(), role: accountType, email: email.trim(), time: created, body: description.trim() }]
        : [],
    };
    await ticketStore.save([ticket, ...tickets]);
    showToast(`Ticket #${ticket.ticketId} created`, "success");
    onClose();
  };

  const fc = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30";
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Create Ticket</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className={fc}>
              {(["client", "vendor", "staff"] as const).map((t) => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={fc}>
              {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Requester name" className={fc} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className={fc} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={fc} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={fc}>
              {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the issue..." className={fc} />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={create} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">Create</button>
        </div>
      </div>
    </div>
  );
};

const ManageTickets: React.FC<{
  onView: (t: Ticket) => void;
  onEdit: (t: Ticket) => void;
}> = ({ onView, onEdit }) => {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const perPage = 10;

  // live list from Dexie, seeded once from the sample data
  const stored = ticketStore.use();
  useEffect(() => {
    if (stored === null) ticketStore.save(sampleTickets);
  }, [stored]);
  // Pull real tickets from the backend into the store (falls back to samples).
  useEffect(() => {
    const nid = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
      return Math.abs(h) || 1;
    };
    api.raw
      .get("/support/tickets/all")
      .then((res) => {
        const arr = toArray<any>(res.data);
        if (!arr.length) return;
        ticketStore.save(
          arr.map((t: any) => ({
            id: nid(String(t._id ?? t.ticket_id)),
            ticketId: t.ticket_id ?? "",
            accountType: (t.account_type ?? "client") as AccountType,
            name: t.name ?? "",
            email: t.email ?? "",
            subject: t.subject ?? "",
            category: t.category ?? "",
            status: (t.status ?? "Open") as TicketStatus,
            created: t.createdAt ? String(t.createdAt).slice(0, 10) : "",
            priority: t.priority ?? "Medium",
            updated: t.updatedAt ? String(t.updatedAt).slice(0, 10) : "",
            messages: [],
          })) as Ticket[],
        );
      })
      .catch(() => {});
  }, []);
  const tickets = stored || sampleTickets;

  const filtered = tickets.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketId.includes(search) ||
      t.category.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      <AppHeader
        breadcrumbs={[
          { label: "Dashboard" },
          { label: "Support Tickets" },
          { label: "Tickets" },
        ]}
      />

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Manage Tickets</h1>
        <button onClick={() => setShowCreate(true)} title="Create Ticket" className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {showCreate && <CreateTicketModal tickets={tickets} onClose={() => setShowCreate(false)} />}

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
                placeholder="Search tickets..."
                className="px-3 py-2 text-sm outline-none w-52"
              />
            </div>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium">
              Search
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-emerald-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-emerald-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            {/* Per page */}
            <div className="relative">
              <select className="appearance-none border border-gray-200 rounded-md pl-3 pr-8 py-2 text-sm bg-white text-gray-700 outline-none cursor-pointer">
                <option>10 per page</option>
                <option>25 per page</option>
                <option>50 per page</option>
              </select>
              <ChevronDownIcon className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Filters */}
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-10">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Ticket ID <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Account Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Name <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Subject <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((ticket, idx) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3.5 text-gray-500 text-sm">
                    {(page - 1) * perPage + idx + 1}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onEdit(ticket)}
                      className="text-blue-500 hover:text-blue-700 hover:underline text-sm font-medium transition-colors"
                    >
                      {ticket.ticketId}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {ticket.accountType}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-gray-900 text-sm leading-tight">
                      {ticket.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {ticket.email}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 text-sm max-w-xs">
                    {ticket.subject}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">
                    {ticket.category}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                    {ticket.created}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onView(ticket)}
                        className="text-emerald-500 hover:text-emerald-700 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(ticket)}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        title="Edit & Reply"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1} to{" "}
              {Math.min(page * perPage, filtered.length)} of {filtered.length}{" "}
              results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronUp className="w-4 h-4 rotate-[-90deg]" /> Previous
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
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 2. Edit & Reply ──────────────────────────────────────────────────────────

const EditReply: React.FC<{
  ticket: Ticket;
  onBack: () => void;
  onPublic: (t: Ticket) => void;
}> = ({ ticket, onBack, onPublic }) => {
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      <AppHeader
        breadcrumbs={[
          { label: "Dashboard" },
          { label: "Support Tickets", onClick: onBack },
          { label: "Edit & Reply" },
        ]}
      />

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Ticket - {ticket.ticketId}
        </h1>
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* ── Left Column ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-w-0">
          {/* Ticket header card */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">
                  #{ticket.ticketId}
                </span>
                <StatusBadge status={ticket.status} />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {ticket.subject}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> {ticket.name}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />{" "}
                {ticket.created.replace(" ", ", ")}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> {ticket.category}
              </span>
            </div>
          </div>

          {/* Messages */}
          {ticket.messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${msg.author === "User" ? "bg-gray-500" : "bg-emerald-500"}`}
                >
                  {msg.author === "User" ? "U" : msg.author.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">
                      {msg.author}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {msg.role}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {msg.email && <span>{msg.email} • </span>}
                    {msg.time}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {msg.body}
              </p>
            </div>
          ))}

          {/* Add Reply */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-emerald-500" /> Add Reply
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reply Message
              </label>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <RichToolbar />
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-sm outline-none resize-none"
                  placeholder="Type your reply..."
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Paperclip className="w-4 h-4 inline mr-1" />
                Attachments
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  placeholder="Select attachments"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-400 bg-white"
                />
                <button className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <Paperclip className="w-4 h-4" /> Browse
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium">
                <Send className="w-4 h-4" /> Send Reply
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 overflow-y-auto bg-white">
          <div className="p-5 space-y-5">
            {/* Ticket Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Info className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">
                  Ticket Information
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  {
                    label: "Status:",
                    value: <StatusBadge status={ticket.status} />,
                    valueClass: "",
                  },
                  {
                    label: "Priority:",
                    value: ticket.priority,
                    valueClass: "text-gray-900 font-medium text-sm",
                  },
                  {
                    label: "Category:",
                    value: ticket.category,
                    valueClass: "text-gray-900 font-medium text-sm text-right",
                  },
                  {
                    label: "Created:",
                    value: ticket.created
                      .split(" ")[0]
                      .replace(/-/g, "/")
                      .replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, "$2/$3/$1"),
                    valueClass: "text-gray-900 text-sm",
                  },
                  {
                    label: "Updated:",
                    value: ticket.updated,
                    valueClass: "text-gray-900 text-sm",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm text-gray-500">{row.label}</span>
                    {typeof row.value === "string" ? (
                      <span className={row.valueClass}>{row.value}</span>
                    ) : (
                      row.value
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">
                  Customer Information
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="font-semibold text-gray-900 text-sm">
                  {ticket.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 mb-3">
                  {ticket.email}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Account Type:</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {ticket.accountType}
                  </span>
                </div>
              </div>
            </div>

            {/* Internal Note */}
            <div className="border border-amber-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100 bg-amber-50">
                <Save className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">
                  Internal Note
                </span>
              </div>
              <div className="p-3">
                <div className="border border-gray-200 rounded-md overflow-hidden mb-3">
                  <RichToolbar compact />
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm outline-none resize-none"
                    placeholder="Add internal note..."
                  />
                </div>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-md transition-colors font-medium">
                  <Save className="w-4 h-4" /> Save Note
                </button>
              </div>
            </div>

            {/* View Public */}
            <button
              onClick={() => onPublic(ticket)}
              className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" /> View Public Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 3. Public View ───────────────────────────────────────────────────────────

const PublicView: React.FC<{ ticket: Ticket; onBack: () => void }> = ({
  ticket,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Teal Navbar */}
      <nav className="bg-emerald-600 text-white px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <span className="text-emerald-600 font-bold text-xs">ST</span>
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base">Support</div>
            <div className="text-xs text-emerald-200">Ticket</div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <button className="hover:text-emerald-200 transition-colors">
            Create Ticket
          </button>
          <button className="hover:text-emerald-200 transition-colors">
            Search Tickets
          </button>
          <button className="hover:text-emerald-200 transition-colors">
            Knowledge Base
          </button>
          <button className="hover:text-emerald-200 transition-colors">
            FAQ
          </button>
        </div>
        <button className="flex items-center gap-2 border border-white/40 rounded-full px-4 py-1.5 text-sm hover:bg-white/10 transition-colors">
          <Headphones className="w-4 h-4" /> Contact
        </button>
      </nav>

      {/* Dot-grid background area */}
      <div
        className="flex-1 relative"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d1fae5 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundColor: "#f0fdf4",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Ticket pill */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-emerald-700 text-white px-5 py-2 rounded-full text-sm font-medium">
              <LayoutList className="w-4 h-4" />
              Ticket - {ticket.ticketId}
            </div>
          </div>

          <div className="flex gap-5 items-start">
            {/* Main content */}
            <div className="flex-1 space-y-4">
              {/* Ticket summary card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    {ticket.subject}
                  </h2>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">Created:</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {ticket.created}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">
                      Customer:
                    </div>
                    <div className="text-sm font-semibold text-gray-800">
                      {ticket.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">Email:</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {ticket.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversation thread */}
              {ticket.messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1 ${msg.author === "User" ? "bg-gray-500" : "bg-emerald-500"}`}
                  >
                    {msg.author === "User" ? "U" : msg.author.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-gray-900 text-sm">
                        {msg.author}
                      </span>
                      <span className="text-xs text-gray-400">
                        (
                        {msg.time
                          .replace(",", "")
                          .split(" ")
                          .slice(0, 2)
                          .join("-")}
                        )
                      </span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-400">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {msg.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Closed notice */}
              {ticket.status === "Closed" && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <span className="text-sm text-gray-400">
                    Ticket is closed and cannot send reply.
                  </span>
                </div>
              )}

              {/* Reply form if open */}
              {ticket.status !== "Closed" && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Send Reply
                  </h3>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none resize-none focus:border-emerald-500 mb-3"
                    placeholder="Type your message..."
                  />
                  <button className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium">
                    <Send className="w-4 h-4" /> Send Reply
                  </button>
                </div>
              )}

              {/* Back button */}
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to admin
              </button>
            </div>

            {/* Ticket Information sidebar */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white">
                  <LayoutList className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    Ticket Information
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { label: "Status:", value: ticket.status, bold: true },
                    {
                      label: "Ticket ID:",
                      value: `#${ticket.ticketId}`,
                      bold: true,
                    },
                    { label: "Created:", value: ticket.created, bold: true },
                    { label: "Customer:", value: ticket.name, bold: true },
                    { label: "Email:", value: ticket.email, bold: true },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <span className="text-sm text-gray-500">{row.label}</span>
                      <span
                        className={`text-sm ${row.bold ? "font-semibold text-gray-900" : "text-gray-700"}`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

export const Tickets: React.FC = () => {
  const [view, setView] = useState<AppView>("list");
  const [selected, setSelected] = useState<Ticket | null>(null);

  if (view === "edit" && selected) {
    return (
      <EditReply
        ticket={selected}
        onBack={() => setView("list")}
        onPublic={(t) => {
          setSelected(t);
          setView("public");
        }}
      />
    );
  }
  if (view === "public" && selected) {
    return <PublicView ticket={selected} onBack={() => setView("edit")} />;
  }

  return (
    <ManageTickets
      onView={(t) => {
        setSelected(t);
        setView("public");
      }}
      onEdit={(t) => {
        setSelected(t);
        setView("edit");
      }}
    />
  );
};

export default Tickets;
