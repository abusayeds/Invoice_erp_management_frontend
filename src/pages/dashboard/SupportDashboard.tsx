/**
 * File: src/pages/SupportDashboard.tsx
 * Complete Support Tickets Dashboard with stats, charts, and ticket management
 * Based on provided screenshots design
 */

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toObject } from "@/services/_http";
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Mail,
  Phone,
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  MessageSquare,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
  Flag,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// Stat cards data
const statCardsSeed = [
  {
    title: "Total Tickets",
    value: "20",
    subtitle: "All time",
    icon: Ticket,
    color: "blue",
  },
  {
    title: "Open Tickets",
    value: "10",
    subtitle: "Pending resolution",
    icon: AlertCircle,
    color: "yellow",
  },
  {
    title: "Closed Tickets",
    value: "6",
    subtitle: "30% resolution rate",
    icon: CheckCircle,
    color: "green",
  },
  {
    title: "Today's Tickets",
    value: "3",
    subtitle: "Created today",
    icon: Calendar,
    color: "purple",
  },
  {
    title: "Avg Response",
    value: "11h",
    subtitle: "Response time",
    icon: Clock,
    color: "orange",
  },
  {
    title: "Categories",
    value: "11",
    subtitle: "Active categories",
    icon: BarChart3,
    color: "indigo",
  },
];

// Ticket trends data (This Year)
const ticketTrendsSeed = [
  { month: "Jan", tickets: 45, resolved: 38 },
  { month: "Feb", tickets: 52, resolved: 42 },
  { month: "Mar", tickets: 48, resolved: 40 },
  { month: "Apr", tickets: 61, resolved: 52 },
  { month: "May", tickets: 58, resolved: 48 },
  { month: "Jun", tickets: 67, resolved: 55 },
  { month: "Jul", tickets: 72, resolved: 62 },
  { month: "Aug", tickets: 68, resolved: 58 },
  { month: "Sep", tickets: 75, resolved: 65 },
  { month: "Oct", tickets: 82, resolved: 70 },
  { month: "Nov", tickets: 78, resolved: 68 },
  { month: "Dec", tickets: 85, resolved: 72 },
];

// Status distribution data
const statusDistributionSeed = [
  { name: "Closed", value: 6, color: "#10B981" },
  { name: "In Progress", value: 8, color: "#3B82F6" },
  { name: "On Hold", value: 3, color: "#F59E0B" },
  { name: "Open", value: 3, color: "#EF4444" },
];

// Category distribution
const categoryDistributionSeed = [
  { name: "Technical Issue", count: 8, color: "#3B82F6" },
  { name: "Billing", count: 5, color: "#10B981" },
  { name: "Feature Request", count: 4, color: "#F59E0B" },
  { name: "Account Management", count: 3, color: "#8B5CF6" },
];

// Recent tickets data
const recentTicketsSeed = [
  {
    id: "#1770791582",
    title: "System Architecture Scalability Planning",
    customer: "Lauren Thompson",
    category: "General Inquiry",
    status: "Closed",
    priority: "Medium",
    date: "2026-02-01",
    time: "13:29",
    avatar: "LT",
  },
  {
    id: "#1770791581",
    title: "Backend System Administration Training",
    customer: "Ryan Anderson",
    category: "Training & Education",
    status: "Closed",
    priority: "Low",
    date: "2026-01-20",
    time: "14:30",
    avatar: "RA",
  },
  {
    id: "#1770791580",
    title: "Backend Security Audit and Hardening",
    customer: "Jessica Martinez",
    category: "Security Concerns",
    status: "In Progress",
    priority: "High",
    date: "2026-01-03",
    time: "13:17",
    avatar: "JM",
  },
  {
    id: "#1770791579",
    title: "Query Optimization for Large Datasets",
    customer: "William Roberts",
    category: "Performance Issues",
    status: "On Hold",
    priority: "High",
    date: "2025-12-27",
    time: "14:13",
    avatar: "WR",
  },
  {
    id: "#1770791578",
    title: "Enterprise SSO Integration Setup",
    customer: "Samantha Evans",
    category: "Integration Support",
    status: "In Progress",
    priority: "Medium",
    date: "2025-12-22",
    time: "17:11",
    avatar: "SE",
  },
  {
    id: "#1770791577",
    title: "Mobile App Performance Optimization",
    customer: "Michael Brown",
    category: "Performance Issues",
    status: "Open",
    priority: "High",
    date: "2025-12-20",
    time: "09:45",
    avatar: "MB",
  },
];

// Priority counts
const priorityCounts = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export const SupportDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState("year");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [statCards, setStatCards] = useState(statCardsSeed);
  const [ticketTrends, setTicketTrends] = useState(ticketTrendsSeed);
  const [statusDistribution, setStatusDistribution] = useState(statusDistributionSeed);
  const [categoryDistribution, setCategoryDistribution] = useState(categoryDistributionSeed);
  const [recentTickets, setRecentTickets] = useState<any[]>(recentTicketsSeed);

  useEffect(() => {
    let alive = true;
    api
      .get("/support/dashboard")
      .then((res: any) => {
        if (!alive) return;
        const d = toObject<any>(res?.data ?? res) || {};
        if (d.statCards?.length)
          setStatCards((prev) =>
            prev.map((c, i) => ({
              ...c,
              value: d.statCards[i]?.value ?? c.value,
              subtitle: d.statCards[i]?.subtitle ?? c.subtitle,
            })),
          );
        if (d.ticketTrends?.length) setTicketTrends(d.ticketTrends);
        if (d.statusDistribution?.length) setStatusDistribution(d.statusDistribution);
        if (d.categoryDistribution?.length) setCategoryDistribution(d.categoryDistribution);
        if (d.recentTickets?.length) setRecentTickets(d.recentTickets);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Closed":
        return "bg-green-100 text-green-700";
      case "In Progress":
        return "bg-blue-100 text-blue-700";
      case "On Hold":
        return "bg-yellow-100 text-yellow-700";
      case "Open":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "Low":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case "Closed":
        return <CheckCircle className="w-3 h-3" />;
      case "In Progress":
        return <Clock className="w-3 h-3" />;
      case "On Hold":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Ticket className="w-3 h-3" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
          <p className="text-sm text-blue-600">
            Tickets: {payload[0]?.value || 0}
          </p>
          <p className="text-sm text-green-600">
            Resolved: {payload[1]?.value || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm p-4 md:p-6">
      <div className="w-full">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            Support Tickets Dashboard
          </span>
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Support Tickets Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage customer inquiries efficiently with our comprehensive
              ticket system
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            const colorClasses = {
              blue: "bg-blue-50 text-blue-600",
              yellow: "bg-yellow-50 text-yellow-600",
              green: "bg-green-50 text-green-600",
              purple: "bg-purple-50 text-purple-600",
              orange: "bg-orange-50 text-orange-600",
              indigo: "bg-indigo-50 text-indigo-600",
            };
            return (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      colorClasses[stat.color as keyof typeof colorClasses]
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 mt-1">{stat.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {stat.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ticket Trends Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Ticket Trends - This Year
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Monthly ticket volume and resolution trends
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Created</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">Resolved</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={ticketTrends}>
              <defs>
                <linearGradient
                  id="ticketsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="resolvedGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
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
              <Area
                type="monotone"
                dataKey="tickets"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#ticketsGradient)"
                name="Created"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#resolvedGradient)"
                name="Resolved"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution and Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Status Distribution
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Current ticket status breakdown
                </p>
              </div>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={220}>
                <RePieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    // formatter={(value: number) => [`${value} tickets`, "Count"]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {statusDistribution.map((status) => (
                  <div
                    key={status.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm text-gray-600">
                        {status.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${(status.value / 20) * 100}%`,
                            backgroundColor: status.color,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {status.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Category Distribution
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tickets by category
                </p>
              </div>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#6B7280" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#6B7280"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  //   formatter={(value: number) => [`${value} tickets`, "Count"]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Recent Tickets
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Latest customer support tickets
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  />
                </div>
                <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <div className="divide-y divide-gray-100">
            {recentTickets.map((ticket, idx) => (
              <div
                key={idx}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        ticket.status === "Closed"
                          ? "bg-green-100 text-green-600"
                          : ticket.status === "In Progress"
                            ? "bg-blue-100 text-blue-600"
                            : ticket.status === "On Hold"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-red-100 text-red-600"
                      }`}
                    >
                      {ticket.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {ticket.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            ticket.status,
                          )}`}
                        >
                          {getStatusIcon(ticket.status)}
                          {ticket.status}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                            ticket.priority,
                          )}`}
                        >
                          <Flag className="w-3 h-3" />
                          {ticket.priority}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm mb-1">
                        {ticket.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ticket.customer}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {ticket.category}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(ticket.date)} • {ticket.time}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto md:ml-0">
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              Showing {recentTickets.length} of {recentTickets.length} tickets
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                1
              </button>
              <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-white transition-colors">
                2
              </button>
              <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-white transition-colors">
                3
              </button>
              <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-white transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="text-xs text-blue-400 font-medium">
              Avg Resolution Time
            </div>
            <div className="text-xl font-bold text-blue-300">2.5 days</div>
            <div className="text-xs text-blue-400/80 mt-1">
              -0.5 days vs last month
            </div>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
            <div className="text-xs text-emerald-400 font-medium">
              Customer Satisfaction
            </div>
            <div className="text-xl font-bold text-emerald-300">4.8/5.0</div>
            <div className="text-xs text-emerald-400/80 mt-1">
              +0.2 vs last month
            </div>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
            <div className="text-xs text-purple-400 font-medium">
              First Response Time
            </div>
            <div className="text-xl font-bold text-purple-300">2.3 hours</div>
            <div className="text-xs text-purple-400/80 mt-1">
              -0.7 hours vs last month
            </div>
          </div>
          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
            <div className="text-xs text-orange-400 font-medium">
              Reopen Rate
            </div>
            <div className="text-xl font-bold text-orange-300">8%</div>
            <div className="text-xs text-orange-400/80 mt-1">
              -2% vs last month
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
