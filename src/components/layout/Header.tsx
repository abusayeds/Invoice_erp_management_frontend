/**
 * File: src/components/layout/Header.tsx
 * Top app header — matches the reference layout (Qayd branding):
 *   logo + tagline | hamburger | search | orange (+) create mega-menu
 *   | timer pill | settings | bell | apps-grid | avatar
 */

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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

/* ── Create mega-menu (columns mirror the reference) ─────────────── */
const createGroups: {
  title: string;
  items: { label: string; icon: React.ElementType; path: string }[];
}[] = [
  {
    title: "Sales",
    items: [
      { label: "Customer", icon: Users, path: "/accounting/customer" },
      { label: "Invoice", icon: FileText, path: "/sales/sales-invoice" },
      { label: "Sales Receipt", icon: Receipt, path: "/sales/sales-invoice" },
      { label: "Proforma Invoice", icon: FileSpreadsheet, path: "/proposal" },
      { label: "Estimate", icon: FileSpreadsheet, path: "/quotation" },
      { label: "Delivery Challan", icon: Truck, path: "/sales/sales-invoice" },
      { label: "Credit Note", icon: CreditCard, path: "/accounting/credit-notes" },
      { label: "Payment Received", icon: DollarSign, path: "/accounting/customer-payments" },
    ],
  },
  {
    title: "Purchases",
    items: [
      { label: "Vendor", icon: Building2, path: "/accounting/vendor" },
      { label: "Bill", icon: FileText, path: "/purchase/purchase-invoice" },
      { label: "Debit Note", icon: CreditCard, path: "/accounting/debit-notes" },
      { label: "Purchase Order", icon: ShoppingCart, path: "/purchase/purchase-invoice" },
      { label: "Expense", icon: Receipt, path: "/accounting/expense" },
      { label: "Payment Made", icon: DollarSign, path: "/accounting/vendor-payments" },
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
      { label: "Time Log", icon: Clock, path: "/timesheet" },
      { label: "Documents", icon: Files, path: "/documents" },
      { label: "My Documents", icon: StickyNote, path: "/documents" },
      { label: "Quick Scan", icon: Scan, path: "/media-library" },
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
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [announcements, setAnnouncements] = useState(sampleAnnouncements);
  const [notifTab, setNotifTab] = useState<"notifications" | "announcements">("notifications");
  const [searchQuery, setSearchQuery] = useState("");

  const createRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setShowCreate(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) setShowApps(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) navigate(`/sales/sales-invoice`);
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
    <div className="h-14 bg-[#0f172a] border-b border-black/20 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
      {/* Mobile-only menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-white/10 rounded transition-colors flex-shrink-0"
        title="Menu"
      >
        <Menu className="w-5 h-5 text-white/85" />
      </button>

      {/* Search + orange (+) — fixed width matching the list panel (450px) */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ width: 450 }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search contact, invoice, estimate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/15"
          />
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
            <div className="absolute right-0 top-11 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-[min(90vw,720px)] max-h-[80vh] overflow-auto custom-scrollbar">
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
        <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 bg-white/10 border border-white/10 rounded-full">
          <button
            onClick={() => setIsTimerRunning((r) => !r)}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title={isTimerRunning ? "Pause timer" : "Start timer"}
          >
            {isTimerRunning ? (
              <Pause className="w-3 h-3 text-white/85" />
            ) : (
              <Play className="w-3 h-3 text-white/85" />
            )}
          </button>
          <span className="text-sm font-mono text-white/85">00:00:00</span>
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
            className="p-1.5 hover:bg-white/10 rounded transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-white/85" />
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

        {/* Apps grid */}
        <div className="relative hidden sm:block" ref={appsRef}>
          <button
            onClick={() => {
              setShowApps((s) => !s);
              setShowCreate(false);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Apps"
          >
            <Grid3x3 className="w-5 h-5 text-white/85" />
          </button>
          {showApps && (
            <div className="absolute right-0 top-11 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50">
              <div className="grid grid-cols-3 gap-1">
                {appShortcuts.map((a) => (
                  <Link
                    key={a.label}
                    to={a.path}
                    onClick={() => setShowApps(false)}
                    className="flex flex-col items-center gap-1 px-2 py-3 rounded-md hover:bg-gray-50 text-center"
                  >
                    <span className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold">
                      {a.label.charAt(0)}
                    </span>
                    <span className="text-[11px] text-gray-600 truncate w-full">{a.label}</span>
                  </Link>
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
            className="flex items-center gap-1 px-1 py-1 hover:bg-white/10 rounded-full transition-colors"
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
