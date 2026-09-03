/**
 * File: src/pages/HRMDashboard.tsx
 * Complete HRM Dashboard with all stats, charts, and visualizations
 * 100% Responsive design matching the screenshot
 */

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toObject } from "@/services/_http";
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  Building2,
  LayoutGrid,
  TrendingUp,
  UserMinus,
  PlusCircle,
  CheckSquare,
  FileText,
  DollarSign,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Award,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  MoreVertical,
  Star,
  Gift,
} from "lucide-react";

// Department distribution data
const departmentDistributionSeed = [
  { name: "Finance & Accounting (Regional Office)", count: 1 },
  { name: "Sales & Marketing (Sales Office)", count: 5 },
  { name: "Operations (Sales Office)", count: 7 },
  { name: "Customer Service (Sales Office)", count: 1 },
  { name: "Research & Development (Customer Service Center)", count: 1 },
  { name: "Quality Assurance (Customer Service Center)", count: 8 },
  { name: "I am a C/Communicator (Customer Service Center)", count: 1 },
];

// Employees on leave data
const employeesOnLeaveSeed = [
  {
    name: "James Garcia",
    type: "Medical Leave",
    days: 3,
    avatar:
      "https://ui-avatars.com/api/?name=James+Garcia&background=3B82F6&color=fff",
  },
  {
    name: "Matthew Clark",
    type: "Casual Leave",
    days: 3,
    avatar:
      "https://ui-avatars.com/api/?name=Matthew+Clark&background=10B981&color=fff",
  },
  {
    name: "Anthony Walker",
    type: "Medical Leave",
    days: 4,
    avatar:
      "https://ui-avatars.com/api/?name=Anthony+Walker&background=F59E0B&color=fff",
  },
];

// Recent leave applications data
const recentLeaveApplicationsSeed = [
  {
    name: "Mark Allen",
    type: "Sick Leave",
    startDate: "2025-10-17",
    endDate: "2025-10-20",
    days: 3,
    status: "Approved",
    avatar:
      "https://ui-avatars.com/api/?name=Mark+Allen&background=EF4444&color=fff",
  },
  {
    name: "Daniel Thompson",
    type: "Study Leave",
    startDate: "2025-10-06",
    endDate: "2025-10-07",
    days: 2,
    status: "Approved",
    avatar:
      "https://ui-avatars.com/api/?name=Daniel+Thompson&background=8B5CF6&color=fff",
  },
  {
    name: "Daniel Thompson",
    type: "Personal Leave",
    startDate: "2025-10-01",
    endDate: "2025-10-01",
    days: 1,
    status: "Pending",
    avatar:
      "https://ui-avatars.com/api/?name=Daniel+Thompson&background=8B5CF6&color=fff",
  },
  {
    name: "Christopher Lee",
    type: "Maternity Leave",
    startDate: "2025-10-17",
    endDate: "2025-10-20",
    days: 2,
    status: "Pending",
    avatar:
      "https://ui-avatars.com/api/?name=Christopher+Lee&background=06B6D4&color=fff",
  },
];

// Announcements data
const announcementsSeed = [
  {
    title: "Workplace Safety Inspection Schedule",
    description:
      "Regular safety inspections ensuring compliance with occupational health standards, equipment maintenance, and hazard identification across all work areas.",
    date: "2025-12-24",
  },
  {
    title: "Quality Management System Certification",
    description:
      "Company pursuing ISO quality certification requiring employee training, process documentation, and compliance procedures across all operational departments.",
    date: "2025-12-09",
  },
  {
    title: "New Employee Orientation Program",
    description:
      "Comprehensive onboarding program for new hires including company culture introduction, policy briefings, department tours, and mentor assignment processes.",
    date: "2025-11-09",
  },
];

// Calendar days for May 2026
const calendarDays = [
  { day: "Sun", date: 26, hasEvent: false },
  { day: "Mon", date: 27, hasEvent: false },
  { day: "Tue", date: 28, hasEvent: false },
  { day: "Wed", date: 29, hasEvent: false },
  { day: "Thu", date: 30, hasEvent: false },
  { day: "Fri", date: 1, hasEvent: true, event: "Team Brainstorming" },
  { day: "Sat", date: 2, hasEvent: false },
];

// Team members data with progress bars
const teamMembersSeed = [
  {
    name: "Sarah Johnson",
    role: "Senior HR Manager",
    department: "Human Resources",
    attendance: 98,
    performance: 95,
    avatar:
      "https://ui-avatars.com/api/?name=Sarah+Johnson&background=3B82F6&color=fff",
    email: "sarah.j@company.com",
    phone: "+1 234 567 8901",
    location: "New York",
  },
  {
    name: "Michael Chen",
    role: "Team Lead",
    department: "Sales & Marketing",
    attendance: 94,
    performance: 92,
    avatar:
      "https://ui-avatars.com/api/?name=Michael+Chen&background=10B981&color=fff",
    email: "michael.c@company.com",
    phone: "+1 234 567 8902",
    location: "San Francisco",
  },
  {
    name: "Emily Rodriguez",
    role: "Senior Developer",
    department: "Research & Development",
    attendance: 96,
    performance: 98,
    avatar:
      "https://ui-avatars.com/api/?name=Emily+Rodriguez&background=8B5CF6&color=fff",
    email: "emily.r@company.com",
    phone: "+1 234 567 8903",
    location: "Austin",
  },
  {
    name: "David Kim",
    role: "QA Manager",
    department: "Quality Assurance",
    attendance: 92,
    performance: 89,
    avatar:
      "https://ui-avatars.com/api/?name=David+Kim&background=F59E0B&color=fff",
    email: "david.k@company.com",
    phone: "+1 234 567 8904",
    location: "Seattle",
  },
  {
    name: "Lisa Wang",
    role: "Customer Support Lead",
    department: "Customer Service",
    attendance: 97,
    performance: 94,
    avatar:
      "https://ui-avatars.com/api/?name=Lisa+Wang&background=EF4444&color=fff",
    email: "lisa.w@company.com",
    phone: "+1 234 567 8905",
    location: "Chicago",
  },
];

// Quick actions data
const quickActions = [
  { name: "Add New Employee", icon: PlusCircle, color: "blue" },
  { name: "Mark Attendance", icon: CheckSquare, color: "green" },
  { name: "Apply for Leave", icon: FileText, color: "purple" },
  { name: "Process Payroll", icon: DollarSign, color: "orange" },
  { name: "Create Promotion", icon: TrendingUp, color: "indigo" },
  { name: "Create Resignation", icon: UserMinus, color: "red" },
];

// Upcoming birthdays
const upcomingBirthdaysSeed = [
  {
    name: "Emma Watson",
    date: "May 15",
    role: "Marketing Specialist",
    avatar:
      "https://ui-avatars.com/api/?name=Emma+Watson&background=EC4899&color=fff",
  },
  {
    name: "James Wilson",
    date: "May 18",
    role: "Software Engineer",
    avatar:
      "https://ui-avatars.com/api/?name=James+Wilson&background=14B8A6&color=fff",
  },
  {
    name: "Sophia Lee",
    date: "May 22",
    role: "HR Coordinator",
    avatar:
      "https://ui-avatars.com/api/?name=Sophia+Lee&background=6366F1&color=fff",
  },
];

export const HRMDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({
    total_employees: 5,
    present_today: 0,
    absent_today: 0,
    on_leave: 2,
    total_branches: 4,
    total_departments: 5,
    promotions_this_month: 1,
    pending_leaves: 0,
  });
  const [departmentDistribution, setDepartmentDistribution] = useState(departmentDistributionSeed);
  const [employeesOnLeave, setEmployeesOnLeave] = useState<any[]>(employeesOnLeaveSeed);
  const [recentLeaveApplications, setRecentLeaveApplications] = useState<any[]>(recentLeaveApplicationsSeed);
  const [announcements, setAnnouncements] = useState<any[]>(announcementsSeed);
  const [teamMembers, setTeamMembers] = useState<any[]>(teamMembersSeed);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>(upcomingBirthdaysSeed);

  useEffect(() => {
    let alive = true;
    api
      .get("/hrm/dashboard")
      .then((res: any) => {
        if (!alive) return;
        const d = toObject<any>(res?.data ?? res) || {};
        if (d.stats) setStats(d.stats);
        if (d.departmentDistribution?.length) setDepartmentDistribution(d.departmentDistribution);
        if (d.employeesOnLeave?.length) setEmployeesOnLeave(d.employeesOnLeave);
        if (d.recentLeaveApplications?.length) setRecentLeaveApplications(d.recentLeaveApplications);
        if (d.announcements?.length) setAnnouncements(d.announcements);
        if (d.teamMembers?.length) setTeamMembers(d.teamMembers);
        if (d.upcomingBirthdays?.length) setUpcomingBirthdays(d.upcomingBirthdays);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            HRM Dashboard
          </h1>
        </div>

        {/* Stats Cards Row - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4 mb-6">
          {/* Total Employees */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">
                Total Employees
              </div>
              <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {stats.total_employees ?? 0}
            </div>
            <div className="text-xs text-green-600 mt-1">Active employees</div>
          </div>

          {/* Present Today */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">
                Present Today
              </div>
              <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {stats.present_today ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Present today</div>
          </div>

          {/* Absent Today */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">
                Absent Today
              </div>
              <UserX className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.absent_today ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">Absent today</div>
          </div>

          {/* On Leave */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">On Leave</div>
              <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.on_leave ?? 0}</div>
            <div className="text-xs text-yellow-600 mt-1">{stats.pending_leaves ?? 0} pending</div>
          </div>

          {/* Total Branch */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">
                Total Branch
              </div>
              <Building2 className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {stats.total_branches ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Active branches</div>
          </div>

          {/* Total Department */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">
                Departments
              </div>
              <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 text-teal-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {stats.total_departments ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Across branches</div>
          </div>

          {/* Total Promotions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">
                Promotions
              </div>
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.promotions_this_month ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">This year</div>
          </div>

          {/* Terminations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">
                Terminations
              </div>
              <UserMinus className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.terminations_this_month ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">This month</div>
          </div>
        </div>

        {/* Team Members Section with Progress Bars - New Addition */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">
              Team Members Performance
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {member.name}
                      </h3>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Attendance Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Attendance</span>
                    <span className="text-xs font-medium text-gray-700">
                      {member.attendance}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${member.attendance}%` }}
                    />
                  </div>
                </div>

                {/* Performance Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Performance</span>
                    <span className="text-xs font-medium text-gray-700">
                      {member.performance}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${member.performance}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 mt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Briefcase className="w-3 h-3" />
                    <span>{member.department}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Distribution, Quick Actions, Employees on Leave */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Department Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Department Distribution
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {departmentDistribution.map((dept, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-gray-50 hover:bg-gray-50 px-2 rounded transition-colors"
                >
                  <span className="text-sm text-gray-700">{dept.name}</span>
                  <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-full">
                    {dept.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                const colorClasses = {
                  blue: "bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20",
                  green: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
                  purple: "bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20",
                  orange: "bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20",
                  indigo: "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20",
                  red: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20",
                };
                return (
                  <button
                    key={idx}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-lg transition-all hover:scale-105 ${colorClasses[action.color as keyof typeof colorClasses]}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">
                      {action.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Employees on Leave */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Employees on Leave
            </h2>
            <div className="space-y-3">
              {employeesOnLeave.map((employee, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-gray-50 hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={employee.avatar}
                      alt={employee.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {employee.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    {employee.days} days
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Events Calendar and Recent Leave Applications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Events & Holidays Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                Events & Holidays Calendar
              </h2>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="font-semibold text-gray-900">May 2026</span>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="flex gap-2 text-sm text-gray-500">
                <button className="hover:text-blue-600">Month</button>
                <button className="hover:text-blue-600">Week</button>
                <button className="hover:text-blue-600">Day</button>
              </div>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {calendarDays.map((day, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-xs text-gray-500 mb-1">{day.day}</div>
                  <div
                    className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm transition-all ${
                      day.hasEvent
                        ? "bg-blue-500 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {day.date}
                  </div>
                  {day.hasEvent && (
                    <div className="text-[10px] text-blue-600 mt-1 hidden sm:block">
                      {day.event}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Calendar Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-7 gap-1 text-center">
                {[
                  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
                  25, 26, 27,
                ].map((date, idx) => (
                  <div
                    key={idx}
                    className={`text-xs p-1 rounded transition-colors cursor-pointer hover:bg-gray-100 ${
                      date === 10
                        ? "bg-blue-100 text-blue-600 font-medium"
                        : "text-gray-600"
                    }`}
                  >
                    {date}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Leave Applications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Recent Leave Applications
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentLeaveApplications.map((leave, idx) => (
                <div
                  key={idx}
                  className="border-b border-gray-50 pb-3 last:border-0 hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={leave.avatar}
                        alt={leave.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">
                            {leave.name}
                          </span>
                          <span className="text-xs text-gray-500">-</span>
                          <span className="text-xs text-gray-600">
                            {leave.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {leave.startDate} - {leave.endDate} ({leave.days}{" "}
                          days)
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        leave.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Birthdays and Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Upcoming Birthdays */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Upcoming Birthdays
              </h2>
              <Gift className="w-5 h-5 text-pink-500" />
            </div>
            <div className="space-y-3">
              {upcomingBirthdays.map((birthday, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-gray-50 hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={birthday.avatar}
                      alt={birthday.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {birthday.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {birthday.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                    <Star className="w-3 h-3" />
                    {birthday.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Announcements
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {announcements.map((announcement, idx) => (
                <div
                  key={idx}
                  className="border-b border-gray-50 pb-4 last:border-0 last:pb-0 hover:bg-gray-50 p-3 rounded transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Bell className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm mb-1">
                        {announcement.title}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {announcement.description}
                      </p>
                      <div className="text-xs text-gray-400 mt-2">
                        {announcement.date}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
