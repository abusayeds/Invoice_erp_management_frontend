/**
 * File: src/pages/CRMDashboard.tsx
 * Complete CRM Dashboard with deals, leads, calendar, and analytics
 * Based on provided screenshots design
 */

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toObject } from "@/services/_http";
import {
  Target,
  Users,
  UserPlus,
  Building2,
  Calendar,
  Phone,
  Mail,
  Star,
  TrendingUp,
  Clock,
  MoreVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  BarChart3,
  PieChart,
  Briefcase,
  Award,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

// Stat cards data
const statCardsSeed = [
  { title: "Total Deals", value: "20", icon: Target, color: "blue" },
  { title: "Total Leads", value: "20", icon: UserPlus, color: "green" },
  { title: "Total Users", value: "27", icon: Users, color: "purple" },
  { title: "Total Clients", value: "11", icon: Building2, color: "orange" },
];

// Deals by stage data
const dealsByStageSeed = [
  { name: "Marketing", value: 16, color: "#3B82F6" },
  { name: "Initial Contact", value: 12, color: "#10B981" },
  { name: "Nurturing", value: 8, color: "#F59E0B" },
  { name: "Qualification", value: 4, color: "#8B5CF6" },
  { name: "Handoff", value: 2, color: "#EF4444" },
  { name: "Close", value: 1, color: "#06B6D4" },
];

// Deal & Lead calls by day data
const callsByDaySeed = [
  { day: "Mon", calls: 14, leads: 10 },
  { day: "Tue", calls: 18, leads: 15 },
  { day: "Wed", calls: 12, leads: 8 },
  { day: "Thu", calls: 16, leads: 12 },
  { day: "Fri", calls: 20, leads: 14 },
  { day: "Sat", calls: 8, leads: 6 },
  { day: "Sun", calls: 4, leads: 3 },
];

// Recently created deals
const recentDealsSeed = [
  {
    name: "Conversion Rate Optimization",
    stage: "Proposal Sent",
    date: "2025-11-29",
    avatar: "C",
    color: "blue",
  },
  {
    name: "Customer Segmentation Analysis",
    stage: "Solution Fit",
    date: "2025-11-23",
    avatar: "C",
    color: "green",
  },
  {
    name: "Marketing Technology Stack",
    stage: "Solution Fit",
    date: "2025-11-20",
    avatar: "M",
    color: "purple",
  },
  {
    name: "Payment Gateway - From Lead",
    stage: "Needs Assessment",
    date: "2025-11-17",
    avatar: "P",
    color: "orange",
  },
];

// Recently created leads
const recentLeadsSeed = [
  {
    name: "Atlas Woods",
    project: "Production Optimization",
    date: "2025-12-08",
    avatar: "AW",
    color: "blue",
  },
  {
    name: "Wren Wallace",
    project: "Supply Chain Management",
    date: "2025-12-02",
    avatar: "WW",
    color: "green",
  },
  {
    name: "Knox Sullivan",
    project: "Learning Management",
    date: "2025-11-26",
    avatar: "KS",
    color: "purple",
  },
  {
    name: "Emery Graham",
    project: "Healthcare Solutions",
    date: "2025-11-20",
    avatar: "EG",
    color: "orange",
  },
];

// Calendar days for May 2026
const calendarDays = [
  { date: 26, day: "Sun", hasEvent: false, event: null, isCurrentMonth: true },
  { date: 27, day: "Mon", hasEvent: false, event: null, isCurrentMonth: true },
  { date: 28, day: "Tue", hasEvent: false, event: null, isCurrentMonth: true },
  { date: 29, day: "Wed", hasEvent: false, event: null, isCurrentMonth: true },
  { date: 30, day: "Thu", hasEvent: false, event: null, isCurrentMonth: true },
  {
    date: 1,
    day: "Fri",
    hasEvent: true,
    event: "Client Meeting",
    isCurrentMonth: false,
  },
  { date: 2, day: "Sat", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 3, day: "Sun", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 4, day: "Mon", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 5, day: "Tue", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 6, day: "Wed", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 7, day: "Thu", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 8, day: "Fri", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 9, day: "Sat", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 10, day: "Sun", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 11, day: "Mon", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 12, day: "Tue", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 13, day: "Wed", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 14, day: "Thu", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 15, day: "Fri", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 16, day: "Sat", hasEvent: false, event: null, isCurrentMonth: false },
  {
    date: 17,
    day: "Sun",
    hasEvent: true,
    event: "Proposal Review",
    isCurrentMonth: false,
  },
  { date: 18, day: "Mon", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 19, day: "Tue", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 20, day: "Wed", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 21, day: "Thu", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 22, day: "Fri", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 23, day: "Sat", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 24, day: "Sun", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 25, day: "Mon", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 26, day: "Tue", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 27, day: "Wed", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 28, day: "Thu", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 29, day: "Fri", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 30, day: "Sat", hasEvent: false, event: null, isCurrentMonth: false },
  { date: 31, day: "Sun", hasEvent: false, event: null, isCurrentMonth: false },
];

// Calendar weeks for proper display
const calendarWeeks = [
  calendarDays.slice(0, 7),
  calendarDays.slice(7, 14),
  calendarDays.slice(14, 21),
  calendarDays.slice(21, 28),
  calendarDays.slice(28, 35),
];

const CRM_PALETTE = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4"];
const CRM_COLORS = ["blue", "green", "purple", "orange"];
const initial = (n: string) => (n || "?").trim().charAt(0).toUpperCase() || "?";

export const CRMDashboard: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState("May 2026");
  const [viewType, setViewType] = useState("week");

  // Backend-backed data (falls back to the seed shapes on empty/error).
  const [statCards, setStatCards] = useState(statCardsSeed);
  const [dealsByStage, setDealsByStage] = useState(dealsByStageSeed);
  const [callsByDay, setCallsByDay] = useState(callsByDaySeed);
  const [recentDeals, setRecentDeals] = useState<any[]>(recentDealsSeed);
  const [recentLeads, setRecentLeads] = useState<any[]>(recentLeadsSeed);

  useEffect(() => {
    let alive = true;
    api
      .get("/crm/dashboard")
      .then((res: any) => {
        if (!alive) return;
        const d = toObject<any>(res?.data ?? res) || {};
        const s = d.stats || {};
        if (Object.keys(s).length)
          setStatCards((prev) =>
            prev.map((c, i) => ({
              ...c,
              value: String(
                [s.total_deals, s.total_leads, s.total_users, s.total_clients][i] ?? c.value,
              ),
            })),
          );
        if (d.dealsByStage?.length)
          setDealsByStage(
            d.dealsByStage.map((x: any, i: number) => ({
              name: x.name,
              value: Number(x.value) || 0,
              color: x.color || CRM_PALETTE[i % CRM_PALETTE.length],
            })),
          );
        if (d.callsByDay?.length) setCallsByDay(d.callsByDay);
        if (d.recentDeals?.length)
          setRecentDeals(
            d.recentDeals.map((x: any, i: number) => ({
              name: x.name,
              stage: x.stage ?? "—",
              date: x.date ? String(x.date).slice(0, 10) : "",
              avatar: initial(x.name),
              color: CRM_COLORS[i % CRM_COLORS.length],
            })),
          );
        if (d.recentLeads?.length)
          setRecentLeads(
            d.recentLeads.map((x: any, i: number) => ({
              name: x.name,
              project: x.project ?? "—",
              date: x.date ? String(x.date).slice(0, 10) : "",
              avatar: initial(x.name),
              color: CRM_COLORS[i % CRM_COLORS.length],
            })),
          );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStageColor = (stage: string): string => {
    const colors: Record<string, string> = {
      "Proposal Sent": "bg-blue-100 text-blue-700",
      "Solution Fit": "bg-green-100 text-green-700",
      "Needs Assessment": "bg-yellow-100 text-yellow-700",
    };
    return colors[stage] || "bg-gray-100 text-gray-700";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
          <p className="text-sm text-blue-600">
            Calls: {payload[0]?.value || 0}
          </p>
          <p className="text-sm text-green-600">
            Leads: {payload[1]?.value || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">CRM Dashboard</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              CRM Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage deals, leads, and customer relationships
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            const colorClasses = {
              blue: "bg-blue-50 text-blue-600",
              green: "bg-green-50 text-green-600",
              purple: "bg-purple-50 text-purple-600",
              orange: "bg-orange-50 text-orange-600",
            };
            return (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      colorClasses[stat.color as keyof typeof colorClasses]
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 mt-1">{stat.title}</div>
              </div>
            );
          })}
        </div>

        {/* Lead Tasks Calendar and Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Lead Tasks Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">
                  Lead Tasks Calendar
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Today
                </button>
                <div className="flex items-center gap-1">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium text-gray-900">
                    May 2026
                  </span>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="mb-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-gray-500 py-2"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              {/* Calendar Body */}
              {calendarWeeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`min-h-[80px] p-1 rounded-lg border ${
                        day.hasEvent
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-100 bg-white"
                      } ${!day.isCurrentMonth ? "opacity-50" : ""}`}
                    >
                      <div className="text-right">
                        <span
                          className={`text-xs ${
                            day.hasEvent
                              ? "font-semibold text-blue-600"
                              : "text-gray-600"
                          }`}
                        >
                          {day.date}
                        </span>
                      </div>
                      {day.hasEvent && (
                        <div className="mt-1">
                          <div className="text-[10px] font-medium text-blue-700 bg-blue-100 px-1 py-0.5 rounded truncate">
                            {day.event}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Calendar Legend */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Client Meeting</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">Proposal Review</span>
              </div>
            </div>
          </div>

          {/* Deal & Lead Calls by Day */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Deal & Lead Calls by Day
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewType("week")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewType === "week"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewType("month")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewType === "month"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Month
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={callsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="day"
                  stroke="#6B7280"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
                <Bar
                  dataKey="calls"
                  fill="#3B82F6"
                  name="Calls"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="leads"
                  fill="#10B981"
                  name="Leads"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deals by Stage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Deals by Stage
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={260}>
                <RePieChart>
                  <Pie
                    data={dealsByStage}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    // label={({ name, percent }) =>
                    //   `${name} ${(percent * 100).toFixed(0)}%`
                    // }
                    labelLine={false}
                  >
                    {dealsByStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    // formatter={(value: number) => [`${value} deals`, "Count"]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="space-y-3">
                {dealsByStage.map((stage) => (
                  <div
                    key={stage.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm text-gray-600">
                        {stage.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${(stage.value / 20) * 100}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {stage.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recently Created Deals and Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recently Created Deals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Recently Created Deals
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Latest deals added to pipeline
                  </p>
                </div>
                <Briefcase className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {recentDeals.map((deal, idx) => {
                const colorClasses = {
                  blue: "bg-blue-100 text-blue-600",
                  green: "bg-green-100 text-green-600",
                  purple: "bg-purple-100 text-purple-600",
                  orange: "bg-orange-100 text-orange-600",
                };
                return (
                  <div
                    key={idx}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${
                            colorClasses[
                              deal.color as keyof typeof colorClasses
                            ]
                          }`}
                        >
                          {deal.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {deal.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStageColor(
                                deal.stage,
                              )}`}
                            >
                              {deal.stage}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {deal.date}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All Deals →
              </button>
            </div>
          </div>

          {/* Recently Created Leads */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Recently Created Leads
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Latest leads added to database
                  </p>
                </div>
                <UserPlus className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {recentLeads.map((lead, idx) => {
                const colorClasses = {
                  blue: "bg-blue-100 text-blue-600",
                  green: "bg-green-100 text-green-600",
                  purple: "bg-purple-100 text-purple-600",
                  orange: "bg-orange-100 text-orange-600",
                };
                return (
                  <div
                    key={idx}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm ${
                            colorClasses[
                              lead.color as keyof typeof colorClasses
                            ]
                          }`}
                        >
                          {lead.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {lead.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {lead.project}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Calendar className="w-3 h-3" />
                            {lead.date}
                          </div>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All Leads →
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="text-xs text-blue-400 font-medium">Win Rate</div>
            <div className="text-xl font-bold text-blue-300">32%</div>
            <div className="text-xs text-blue-400/80 mt-1">+5% vs last month</div>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
            <div className="text-xs text-emerald-400 font-medium">
              Avg Deal Size
            </div>
            <div className="text-xl font-bold text-emerald-300">
              {formatCurrency(24500)}
            </div>
            <div className="text-xs text-emerald-400/80 mt-1">+8% vs last month</div>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
            <div className="text-xs text-purple-400 font-medium">
              Sales Cycle
            </div>
            <div className="text-xl font-bold text-purple-300">28 days</div>
            <div className="text-xs text-purple-400/80 mt-1">
              -3 days vs last month
            </div>
          </div>
          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
            <div className="text-xs text-orange-400 font-medium">
              Lead Conversion
            </div>
            <div className="text-xl font-bold text-orange-300">18%</div>
            <div className="text-xs text-orange-400/80 mt-1">
              +2% vs last month
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
