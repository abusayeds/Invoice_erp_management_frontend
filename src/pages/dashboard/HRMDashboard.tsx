/**
 * File: src/pages/dashboard/HRMDashboard.tsx
 * HRM Dashboard — API-backed stats and lists (no local seed data).
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
  ChevronRight,
  Clock,
  Gift,
  Star,
  Briefcase,
  MoreVertical,
} from "lucide-react";

const emptyStats = {
  total_employees: 0,
  present_today: 0,
  absent_today: 0,
  on_leave: 0,
  total_branches: 0,
  total_departments: 0,
  promotions_this_month: 0,
  pending_leaves: 0,
  terminations_this_month: 0,
};

const quickActions = [
  { name: "Add New Employee", icon: PlusCircle, color: "blue" },
  { name: "Mark Attendance", icon: CheckSquare, color: "green" },
  { name: "Apply for Leave", icon: FileText, color: "purple" },
  { name: "Process Payroll", icon: DollarSign, color: "orange" },
  { name: "Create Promotion", icon: TrendingUp, color: "indigo" },
  { name: "Create Resignation", icon: UserMinus, color: "red" },
];

export const HRMDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(emptyStats);
  const [departmentDistribution, setDepartmentDistribution] = useState<any[]>([]);
  const [employeesOnLeave, setEmployeesOnLeave] = useState<any[]>([]);
  const [recentLeaveApplications, setRecentLeaveApplications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    api
      .get("/hrm/dashboard")
      .then((res: any) => {
        if (!alive) return;
        const d = toObject<any>(res?.data ?? res) || {};
        if (d.stats) setStats({ ...emptyStats, ...d.stats });
        if (Array.isArray(d.departmentDistribution)) setDepartmentDistribution(d.departmentDistribution);
        if (Array.isArray(d.employeesOnLeave)) setEmployeesOnLeave(d.employeesOnLeave);
        if (Array.isArray(d.recentLeaveApplications)) setRecentLeaveApplications(d.recentLeaveApplications);
        if (Array.isArray(d.announcements)) setAnnouncements(d.announcements);
        if (Array.isArray(d.teamMembers)) setTeamMembers(d.teamMembers);
        if (Array.isArray(d.upcomingBirthdays)) setUpcomingBirthdays(d.upcomingBirthdays);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const Empty = ({ message }: { message: string }) => (
    <p className="text-sm text-gray-400 py-6 text-center">{message}</p>
  );

  return (
    <div className="dashboard-shell custom-scrollbar p-4 md:p-6">
      <div className="w-full">
        <div className="dashboard-title-bar -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">HRM Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4 mb-6">
          {[
            { label: "Total Employees", value: stats.total_employees ?? 0, sub: "Active employees", icon: Users, color: "text-blue-500" },
            { label: "Present Today", value: stats.present_today ?? 0, sub: "Present today", icon: UserCheck, color: "text-green-500" },
            { label: "Absent Today", value: stats.absent_today ?? 0, sub: "Absent today", icon: UserX, color: "text-red-500" },
            { label: "On Leave", value: stats.on_leave ?? 0, sub: `${stats.pending_leaves ?? 0} pending`, icon: CalendarDays, color: "text-yellow-500", subClass: "text-yellow-600" },
            { label: "Total Branch", value: stats.total_branches ?? 0, sub: "Active branches", icon: Building2, color: "text-indigo-500" },
            { label: "Departments", value: stats.total_departments ?? 0, sub: "Across branches", icon: LayoutGrid, color: "text-teal-500" },
            { label: "Promotions", value: stats.promotions_this_month ?? 0, sub: "This year", icon: TrendingUp, color: "text-purple-500" },
            { label: "Terminations", value: stats.terminations_this_month ?? 0, sub: "This month", icon: UserMinus, color: "text-red-500" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-gray-500">{card.label}</div>
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${card.color}`} />
                </div>
                <div className="text-xl md:text-2xl font-bold text-gray-900">{card.value}</div>
                <div className={`text-xs mt-1 ${card.subClass ?? "text-gray-500"}`}>{card.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Team Members Performance</h2>
          </div>
          {teamMembers.length === 0 ? (
            <Empty message="No team performance data yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                          {(member.name || "?").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{member.name}</h3>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  {member.attendance != null && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Attendance</span>
                        <span className="text-xs font-medium text-gray-700">{member.attendance}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${member.attendance}%` }} />
                      </div>
                    </div>
                  )}
                  {member.department && (
                    <div className="pt-2 border-t border-gray-200 mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Briefcase className="w-3 h-3" />
                      <span>{member.department}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Department Distribution</h2>
            {departmentDistribution.length === 0 ? (
              <Empty message="No department data." />
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {departmentDistribution.map((dept, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 px-2">
                    <span className="text-sm text-gray-700">{dept.name}</span>
                    <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-full">{dept.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                const colorClasses: Record<string, string> = {
                  blue: "bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20",
                  green: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
                  purple: "bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20",
                  orange: "bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20",
                  indigo: "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20",
                  red: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20",
                };
                return (
                  <button key={idx} type="button" className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all ${colorClasses[action.color]}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">{action.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Employees on Leave</h2>
            {employeesOnLeave.length === 0 ? (
              <Empty message="No employees on leave." />
            ) : (
              <div className="space-y-3">
                {employeesOnLeave.map((employee, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 p-2">
                    <div className="flex items-center gap-3">
                      {employee.avatar && <img src={employee.avatar} alt={employee.name} className="w-10 h-10 rounded-full object-cover" />}
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{employee.name}</div>
                        <div className="text-xs text-gray-500">{employee.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {employee.days} days
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Leave Applications</h2>
            {recentLeaveApplications.length === 0 ? (
              <Empty message="No recent leave applications." />
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentLeaveApplications.map((leave, idx) => (
                  <div key={idx} className="border-b border-gray-50 pb-3 last:border-0 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900 text-sm">{leave.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{leave.type}</span>
                        <div className="text-xs text-gray-400 mt-1">
                          {leave.startDate} - {leave.endDate} ({leave.days} days)
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${leave.status === "Approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {leave.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Upcoming Birthdays</h2>
              <Gift className="w-5 h-5 text-pink-500" />
            </div>
            {upcomingBirthdays.length === 0 ? (
              <Empty message="No upcoming birthdays." />
            ) : (
              <div className="space-y-3">
                {upcomingBirthdays.map((birthday, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 p-2">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{birthday.name}</div>
                      <div className="text-xs text-gray-500">{birthday.role}</div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      <Star className="w-3 h-3" />
                      {birthday.date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Announcements</h2>
          {announcements.length === 0 ? (
            <Empty message="No announcements." />
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {announcements.map((announcement, idx) => (
                <div key={idx} className="border-b border-gray-50 pb-4 last:border-0 p-3">
                  <div className="flex items-start gap-3">
                    <Bell className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm mb-1">{announcement.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{announcement.description}</p>
                      {announcement.date && <div className="text-xs text-gray-400 mt-2">{announcement.date}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
