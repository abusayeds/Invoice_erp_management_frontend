/**
 * File: src/pages/RecruitmentDashboard.tsx
 * Complete Recruitment Dashboard with all stats, charts, and visualizations
 * Based on provided screenshots design
 */

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toObject } from "@/services/_http";
import {
  Users,
  UserCheck,
  UserPlus,
  Calendar,
  Briefcase,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle,
  FileText,
  Mail,
  Phone,
  MapPin,
  Star,
  MoreVertical,
  Eye,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// Status overview data
const statusOverviewSeed = [
  { name: "Applied", value: 2, color: "#3B82F6" },
  { name: "Shortlisted", value: 7, color: "#10B981" },
  { name: "Interview", value: 4, color: "#F59E0B" },
  { name: "Hired", value: 3, color: "#8B5CF6" },
];

// Hiring funnel data
const hiringFunnelSeed = [
  { stage: "Applications", candidates: 16, percentage: 100, color: "#3B82F6" },
  { stage: "Shortlisted", candidates: 7, percentage: 44, color: "#10B981" },
  { stage: "Interviewed", candidates: 4, percentage: 25, color: "#F59E0B" },
  { stage: "Hired", candidates: 3, percentage: 19, color: "#8B5CF6" },
];

// Onboarding progress data (pie chart)
const onboardingProgressSeed = [
  { name: "Completed", value: 47, color: "#3B82F6" },
  { name: "In Progress", value: 14, color: "#10B981" },
  { name: "Pending", value: 3, color: "#F59E0B" },
];

// Calendar days for May 2026
const calendarDays = [
  { day: "Sun", date: 26, hasEvent: false },
  { day: "Mon", date: 27, hasEvent: false },
  { day: "Tue", date: 28, hasEvent: false },
  { day: "Wed", date: 29, hasEvent: false },
  { day: "Thu", date: 30, hasEvent: false },
  {
    day: "Fri",
    date: 1,
    hasEvent: true,
    event: "Interview Bob Johns",
    time: "10:00 AM",
  },
  { day: "Sat", date: 2, hasEvent: false },
];

// Upcoming interviews
const upcomingInterviewsSeed = [
  {
    candidate: "Bob Johnson",
    position: "Senior Frontend Developer",
    date: "May 15, 2026",
    time: "10:00 AM",
    status: "scheduled",
    avatar:
      "https://ui-avatars.com/api/?name=Bob+Johnson&background=3B82F6&color=fff",
  },
  {
    candidate: "Sarah Williams",
    position: "Product Manager",
    date: "May 16, 2026",
    time: "2:00 PM",
    status: "scheduled",
    avatar:
      "https://ui-avatars.com/api/?name=Sarah+Williams&background=10B981&color=fff",
  },
  {
    candidate: "Michael Chen",
    position: "Backend Engineer",
    date: "May 17, 2026",
    time: "11:30 AM",
    status: "pending",
    avatar:
      "https://ui-avatars.com/api/?name=Michael+Chen&background=F59E0B&color=fff",
  },
];

// Recent candidates
const recentCandidatesSeed = [
  {
    name: "Emily Rodriguez",
    position: "UX Designer",
    stage: "Interview",
    appliedDate: "2026-05-01",
    avatar:
      "https://ui-avatars.com/api/?name=Emily+Rodriguez&background=8B5CF6&color=fff",
  },
  {
    name: "David Kim",
    position: "DevOps Engineer",
    stage: "Shortlisted",
    appliedDate: "2026-04-28",
    avatar:
      "https://ui-avatars.com/api/?name=David+Kim&background=EF4444&color=fff",
  },
  {
    name: "Lisa Wang",
    position: "Data Scientist",
    stage: "Applied",
    appliedDate: "2026-04-25",
    avatar:
      "https://ui-avatars.com/api/?name=Lisa+Wang&background=06B6D4&color=fff",
  },
];

// Open positions
const openPositionsSeed = [
  {
    title: "Senior Frontend Developer",
    department: "Engineering",
    applicants: 24,
    daysOpen: 5,
    priority: "High",
  },
  {
    title: "Product Manager",
    department: "Product",
    applicants: 18,
    daysOpen: 3,
    priority: "High",
  },
  {
    title: "DevOps Engineer",
    department: "Infrastructure",
    applicants: 12,
    daysOpen: 7,
    priority: "Medium",
  },
];

export const RecruitmentDashboard: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState("May 2026");

  const [statusOverview, setStatusOverview] = useState(statusOverviewSeed);
  const [hiringFunnel, setHiringFunnel] = useState(hiringFunnelSeed);
  const [onboardingProgress, setOnboardingProgress] = useState(onboardingProgressSeed);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>(upcomingInterviewsSeed);
  const [recentCandidates, setRecentCandidates] = useState<any[]>(recentCandidatesSeed);
  const [openPositions, setOpenPositions] = useState<any[]>(openPositionsSeed);

  useEffect(() => {
    let alive = true;
    api
      .get("/recruitment/dashboard")
      .then((res: any) => {
        if (!alive) return;
        const d = toObject<any>(res?.data ?? res) || {};
        if (d.statusOverview?.length) setStatusOverview(d.statusOverview);
        if (d.hiringFunnel?.length) setHiringFunnel(d.hiringFunnel);
        if (d.onboardingProgress?.length) setOnboardingProgress(d.onboardingProgress);
        if (d.upcomingInterviews?.length) setUpcomingInterviews(d.upcomingInterviews);
        if (d.recentCandidates?.length) setRecentCandidates(d.recentCandidates);
        if (d.openPositions?.length) setOpenPositions(d.openPositions);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Interview":
        return "bg-yellow-100 text-yellow-700";
      case "Shortlisted":
        return "bg-green-100 text-green-700";
      case "Applied":
        return "bg-blue-100 text-blue-700";
      case "Hired":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-900">{payload[0].name}</p>
          <p className="text-lg font-bold text-gray-900">{payload[0].value}</p>
          <p className="text-xs text-gray-500">Candidates</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Recruitment Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Streamline your hiring process with our comprehensive recruitment
            management system. From job posting to candidate onboarding, manage
            your entire talent pipeline efficiently.
          </p>
          <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Copy className="w-4 h-4" />
            Copy Career Portal
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Interview Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">
                  Interview Calendar
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
            <div className="mb-6">
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

              {/* Calendar Days Row 1 */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {[26, 27, 28, 29, 30, 1, 2].map((date, idx) => (
                  <div
                    key={idx}
                    className={`min-h-[80px] p-2 rounded-lg border ${
                      date === 1
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <div className="text-right">
                      <span
                        className={`text-sm ${
                          date === 1
                            ? "font-semibold text-blue-600"
                            : "text-gray-600"
                        }`}
                      >
                        {date}
                      </span>
                    </div>
                    {date === 1 && (
                      <div className="mt-1">
                        <div className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                          Interview Bob Johns
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Calendar Days Row 2-5 */}
              {[
                [3, 4, 5, 6, 7, 8, 9],
                [10, 11, 12, 13, 14, 15, 16],
                [17, 18, 19, 20, 21, 22, 23],
                [24, 25, 26, 27, 28, 29, 30],
              ].map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
                  {week.map((date, idx) => (
                    <div
                      key={idx}
                      className="min-h-[80px] p-2 rounded-lg border border-gray-100 bg-white"
                    >
                      <div className="text-right">
                        <span className="text-sm text-gray-600">{date}</span>
                      </div>
                      {date === 15 && (
                        <div className="mt-1">
                          <div className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                            Interview Sarah
                          </div>
                        </div>
                      )}
                      {date === 17 && (
                        <div className="mt-1">
                          <div className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-md">
                            Tech Interview
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Upcoming Interviews List */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Upcoming Interviews
              </h3>
              <div className="space-y-3">
                {upcomingInterviews.map((interview, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={interview.avatar}
                        alt={interview.candidate}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {interview.candidate}
                        </div>
                        <div className="text-xs text-gray-500">
                          {interview.position}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {interview.time}
                      </div>
                      <div className="text-xs text-gray-500">
                        {interview.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Status Overview and Onboarding */}
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Status Overview
              </h2>
              <div className="flex items-center justify-center mb-6">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusOverview}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusOverview.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {statusOverview.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Onboarding Progress */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Onboarding Progress
              </h2>
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={onboardingProgress}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {onboardingProgress.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {onboardingProgress.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hiring Funnel Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-6">
            Hiring Funnel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hiringFunnel.map((item, idx) => (
              <div
                key={idx}
                className="relative p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">
                    {item.stage}
                  </h3>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {item.candidates} Candidates
                </div>
                <div className="text-xs text-gray-500 mb-3">Initial stage</div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <div className="text-right text-xs font-medium mt-1">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention Required, Recent Candidates, Open Positions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attention Required */}
          <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Attention Required
                </h2>
                <p className="text-sm text-red-600">1 items need attention</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    Pending Onboarding
                  </div>
                  <div className="text-xs text-gray-500">
                    3 candidates waiting
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Review →
                </button>
              </div>
            </div>
          </div>

          {/* Recent Candidates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Recent Candidates
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentCandidates.map((candidate, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={candidate.avatar}
                      alt={candidate.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {candidate.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {candidate.position}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStageColor(
                        candidate.stage,
                      )}`}
                    >
                      {candidate.stage}
                    </span>
                    <div className="text-xs text-gray-400 mt-1">
                      {candidate.appliedDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open Positions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Open Positions
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                + Post Job
              </button>
            </div>
            <div className="space-y-3">
              {openPositions.map((position, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-gray-100 rounded-lg hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {position.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {position.department}
                      </div>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                        position.priority,
                      )}`}
                    >
                      {position.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {position.applicants} applicants
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {position.daysOpen} days open
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="text-xs text-blue-400 font-medium">
              Total Applications
            </div>
            <div className="text-2xl font-bold text-blue-300">142</div>
            <div className="text-xs text-blue-400/80 mt-1">+23% this month</div>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
            <div className="text-xs text-emerald-400 font-medium">
              Interview Rate
            </div>
            <div className="text-2xl font-bold text-emerald-300">31%</div>
            <div className="text-xs text-emerald-400/80 mt-1">+5% vs last month</div>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
            <div className="text-xs text-purple-400 font-medium">
              Offer Acceptance
            </div>
            <div className="text-2xl font-bold text-purple-300">94%</div>
            <div className="text-xs text-purple-400/80 mt-1">12 of 13 offers</div>
          </div>
          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
            <div className="text-xs text-orange-400 font-medium">
              Time to Hire
            </div>
            <div className="text-2xl font-bold text-orange-300">12 days</div>
            <div className="text-xs text-orange-400/80 mt-1">
              -3 days vs last month
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
