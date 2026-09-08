/**
 * File: src/components/layout/Header.tsx
 * Top app header — matches the reference layout (Qayd branding):
 *   logo + tagline | hamburger | search | orange (+) create mega-menu
 *   | timer pill | settings | bell | apps-grid | avatar
 */

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { repo } from "@/lib/db";
import {
  Search,
  Plus,
  Play,
  Pause,
  Bell,
  ChevronDown,
  Menu,
  X,
  Check,
  Megaphone,
  Building2,
  User as UserIcon,
  Settings,
  LogOut,
  Grid3x3,
  Users,
  FileText,
  Receipt,
  FileSpreadsheet,
  StickyNote,
  DollarSign,
  Truck,
  ShoppingCart,
  CreditCard,
  Package,
  Wrench,
  FolderOpen,
  Clock,
  Files,
  Scan,
} from "lucide-react";
import { SettingsDropdown } from "@/pages/SettingsDropdown";
import useAuth from "@/hooks/useAuth";

interface HeaderProps {
  onMenuClick: () => void;
}

/* ── Global search sources (Dexie collections mirror the backend) ── */
type SearchHit = { type: string; label: string; sub?: string; path: string };
const SEARCH_SOURCES: {
  c: string; t: string; path: string | ((r: any) => string);
  label: (r: any) => string; keys: (r: any) => (string | undefined)[];
}[] = [
  { c: "customers", t: "Customer", path: "/sales/customers",
    label: (r) => r.businessProfile?.companyName || r.name || r.contact || "Customer",
    keys: (r) => [r.name, r.email, r.phone, r.contact, r.businessProfile?.companyName] },
  { c: "vendors", t: "Vendor", path: "/purchase/vendors",
    label: (r) => r.name || r.contact || "Vendor",
    keys: (r) => [r.name, r.email, r.contact] },
  { c: "products", t: "Product", path: "/items/product",
    label: (r) => r.name, keys: (r) => [r.name, r.sku] },
  { c: "services", t: "Service", path: "/items/services",
    label: (r) => r.name, keys: (r) => [r.name] },
  { c: "invoices", t: "Invoice", path: "/sales/sales-invoice",
    label: (r) => r.number || `Invoice ${r.id}`, keys: (r) => [r.number, r.name] },
  { c: "estimates", t: "Estimate", path: "/sales/estimates",
    label: (r) => r.number || `Estimate ${r.id}`, keys: (r) => [r.number, r.name] },
  { c: "proformas", t: "Proforma", path: "/sales/proforma-invoices",
    label: (r) => r.number || `Proforma ${r.id}`, keys: (r) => [r.number, r.name] },
  { c: "salesReceipts", t: "Sales Receipt", path: "/sales/sales-receipts",
    label: (r) => r.number || `Receipt ${r.id}`, keys: (r) => [r.number, r.name] },
  { c: "creditNotes", t: "Credit Note", path: "/sales/credit-notes",
    label: (r) => r.number || `Credit Note ${r.id}`, keys: (r) => [r.number, r.name] },
  { c: "bills", t: "Bill", path: "/purchase/bills",
    label: (r) => r.number || `Bill ${r.id}`, keys: (r) => [r.number, r.name] },
  { c: "purchaseOrders", t: "Purchase Order", path: "/purchase/purchase-orders",
    label: (r) => r.number || `PO ${r.id}`, keys: (r) => [r.number, r.name] },
  { c: "debitNotes", t: "Debit Note", path: "/purchase/debit-notes",
    label: (r) => r.number || `Debit Note ${r.id}`, keys: (r) => [r.number, r.name] },
  { c: "projects", t: "Project", path: (r) => `/project/projects/${r.id}`,
    label: (r) => r.name, keys: (r) => [r.name, r.description] },
];

/* ── Create mega-menu (columns mirror the reference) ─────────────── */
const createGroups: {
  title: string;
  items: { label: string; icon: React.ElementType; path: string }[];
}[] = [
  {
    title: "Sales",
    items: [
      { label: "Customer", icon: Users, path: "/sales/customers" },
      { label: "Invoice", icon: FileText, path: "/sales/sales-invoice" },
      { label: "Sales Receipt", icon: Receipt, path: "/sales/sales-receipts" },
      { label: "Proforma Invoice", icon: FileSpreadsheet, path: "/sales/proforma-invoices" },
      { label: "Estimate", icon: FileSpreadsheet, path: "/sales/estimates" },
      { label: "Delivery Challan", icon: Truck, path: "/sales/delivery-challan" },
      { label: "Credit Note", icon: CreditCard, path: "/sales/credit-notes" },
      { label: "Payment Received", icon: DollarSign, path: "/sales/payment-received" },
    ],
  },
  {
    title: "Purchases",
    items: [
      { label: "Vendor", icon: Building2, path: "/purchase/vendors" },
      { label: "Bill", icon: FileText, path: "/purchase/bills" },
      { label: "Debit Note", icon: CreditCard, path: "/purchase/debit-notes" },
      { label: "Purchase Order", icon: ShoppingCart, path: "/purchase/purchase-orders" },
      { label: "Expense", icon: Receipt, path: "/purchase/expense" },
      { label: "Payment Made", icon: DollarSign, path: "/purchase/payment-made" },
    ],
  },
  {
    title: "Items",
    items: [
      { label: "Product", icon: Package, path: "/items/product" },
      { label: "Service", icon: Wrench, path: "/items/services" },
    ],
  },
  {
    title: "Others",
    items: [
      { label: "Project", icon: FolderOpen, path: "/project/projects" },
      { label: "Time Log", icon: Clock, path: "/time-logs" },
      { label: "My Documents", icon: StickyNote, path: "/documents/my-documents" },
      { label: "Quick Scan", icon: Scan, path: "/documents/quick-scan" },
    ],
  },
];

const sampleAnnouncements = [
  { id: 1, title: "New feature: Bulk Invoice Export", description: "You can now export multiple invoices at once as PDF or CSV from the Invoices page.", date: "Apr 26, 2026", isNew: true },
  { id: 2, title: "Scheduled maintenance — Apr 30", description: "The app will be unavailable from 2:00 AM to 4:00 AM UTC on April 30 for scheduled maintenance.", date: "Apr 24, 2026", isNew: true },
  { id: 3, title: "Tax season reminder", description: "Don't forget to generate your quarterly tax reports before the deadline.", date: "Apr 18, 2026", isNew: false },
];

const sampleNotifications = [
  { id: 1, title: "Invoice #1 is overdue", description: "Spark Tech Agency — $5,000 due", time: "2h ago", unread: true },
  { id: 2, title: "Payment received", description: "Tech Corp paid Invoice #2", time: "5h ago", unread: true },
  { id: 3, title: "New vendor added", description: "Fair Electronics was added", time: "1d ago", unread: false },
];

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = user?.name || "Faisal Chowdhury";
  const displayEmail = user?.email || "chowdhuryfaisal66@gmail.com";
  const initial = displayName.charAt(0).toUpperCase();

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [announcements, setAnnouncements] = useState(sampleAnnouncements);
  const [notifTab, setNotifTab] = useState<"notifications" | "announcements">("notifications");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const createRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Global search: debounced query across the Dexie collections (which mirror
  // the backend). Matches by name/number/email; results navigate to the item.
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const hits: SearchHit[] = [];
      for (const src of SEARCH_SOURCES) {
        let rows: any[] = [];
        try { rows = await repo.getAll(src.c as any); } catch { rows = []; }
        let perType = 0;
        for (const r of rows) {
          const hay = src.keys(r).filter(Boolean).join(" ").toLowerCase();
          if (hay.includes(q)) {
            hits.push({ type: src.t, label: String(src.label(r) || "—"),
              path: typeof src.path === "function" ? src.path(r) : src.path });
            if (++perType >= 5) break;
          }
        }
      }
      if (!cancelled) setSearchResults(hits.slice(0, 40));
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

  // Working stopwatch: ticks every second while running; pause holds the value,
  // play resumes from where it stopped.
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isTimerRunning]);

  const formatTimer = (total: number) => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setShowCreate(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) setShowApps(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  const goToHit = (h: SearchHit) => {
    navigate(h.path);
    setSearchQuery("");
    setShowSearch(false);
  };
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchResults.length > 0) goToHit(searchResults[0]);
    if (e.key === "Escape") setShowSearch(false);
  };

  const appShortcuts = [
    { label: "Dashboard", path: "/" },
    { label: "Invoices", path: "/sales/sales-invoice" },
    { label: "Customers", path: "/accounting/customer" },
    { label: "Products", path: "/items/product" },
    { label: "Reports", path: "/reports" },
    { label: "HRM", path: "/hrm/employees" },
    { label: "CRM", path: "/crm/leads" },
    { label: "Projects", path: "/project/projects" },
    { label: "Timesheet", path: "/timesheet" },
  ];

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
      {/* Mobile-only menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        title="Menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Search + orange (+) — fixed width matching the list panel (450px) */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ width: 450 }}>
        <div className="relative flex-1" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search contact, invoice, estimate..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            onKeyDown={handleSearch}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 border border-gray-200 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-gray-300 focus:bg-white text-base py-2.5"
          />
          {showSearch && searchQuery.trim() && (
            <div className="absolute left-0 top-11 w-[min(92vw,460px)] max-h-[70vh] overflow-auto custom-scrollbar bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                  No results for "{searchQuery.trim()}"
                </div>
              ) : (
                searchResults.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => goToHit(h)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-800 truncate">{h.label}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 whitespace-nowrap">{h.type}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Orange create (+) with mega menu — immediately right of search */}
        <div className="relative flex-shrink-0" ref={createRef}>
          <button
            onClick={() => {
              setShowCreate((s) => !s);
              setShowNotifications(false);
              setShowUserMenu(false);
              setShowApps(false);
            }}
            className="w-9 h-9 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center transition-colors shadow-sm"
            title="Create new"
          >
            <Plus className="w-5 h-5 text-white" strokeWidth={2.2} />
          </button>

          {showCreate && (
            <div className="absolute left-0 top-11 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-[min(90vw,720px)] max-h-[80vh] overflow-auto custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
                {createGroups.map((group) => (
                  <div key={group.title} className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{group.title}</h4>
                    <ul className="space-y-0.5">
                      {group.items.map((it) => (
                        <li key={it.label}>
                          <Link
                            to={it.path}
                            onClick={() => setShowCreate(false)}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <it.icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="truncate">{it.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to push right cluster to the end */}
      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

        {/* Timer pill */}
        <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 bg-gray-100 border border-gray-200 rounded-full py-1.5 px-3">
          <button
            onClick={() => setIsTimerRunning((r) => !r)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-gray-200 shadow-sm border border-gray-200 transition-colors"
            title={isTimerRunning ? "Pause timer" : "Start timer"}
          >
            {isTimerRunning ? (
              <Pause className="w-4 h-4 text-gray-700" />
            ) : (
              <Play className="w-4 h-4 text-gray-700" />
            )}
          </button>
          <span className="text-base font-mono text-gray-700 font-medium">{formatTimer(timerSeconds)}</span>
        </div>

        {/* Settings */}
        <div className="hidden sm:block">
          <SettingsDropdown />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications((s) => !s);
              setShowCreate(false);
              setShowUserMenu(false);
              setShowApps(false);
            }}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-6 h-6 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Updates</h3>
                <div className="flex items-center gap-2">
                  {notifTab === "notifications" && unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setNotifTab("notifications")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${notifTab === "notifications" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                >
                  <Bell className="w-3.5 h-3.5" /> Notifications
                </button>
                <button
                  onClick={() => setNotifTab("announcements")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${notifTab === "announcements" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                >
                  <Megaphone className="w-3.5 h-3.5" /> Announcements
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifTab === "notifications"
                  ? notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n)))}
                        className={`px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${notif.unread ? "bg-blue-50" : ""}`}
                      >
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                      </div>
                    ))
                  : announcements.map((ann) => (
                      <div
                        key={ann.id}
                        onClick={() => setAnnouncements((prev) => prev.map((a) => (a.id === ann.id ? { ...a, isNew: false } : a)))}
                        className={`px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${ann.isNew ? "bg-orange-50" : ""}`}
                      >
                        <p className="text-sm font-medium text-gray-900">{ann.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ann.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{ann.date}</p>
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => {
              setShowUserMenu((s) => !s);
              setShowCreate(false);
              setShowNotifications(false);
              setShowApps(false);
            }}
            className="flex items-center gap-1 px-1 py-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              {initial}
            </div>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-white/70" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
              </div>
              <Link to="/companies" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Building2 className="w-4 h-4 text-gray-400" /> My Company
              </Link>
              <Link to="/team" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <UserIcon className="w-4 h-4 text-gray-400" /> Team
              </Link>
              <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Settings className="w-4 h-4 text-gray-400" /> Settings
              </Link>
              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  onClick={() => { setShowUserMenu(false); logout(); navigate("/auth/login"); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
