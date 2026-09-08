/**
 * File: src/pages/ProjectDashboard.tsx
 * Complete Project Dashboard with all stats, charts, and visualizations
 */

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toObject } from "@/services/_http";
import { FileText, CheckCircle, Bug, Users, UserCheck } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Line chart data
const monthlyProgressDataSeed = [
  { month: "Dec", tasksCompleted: 18, tasksCreated: 20 },
  { month: "Jan", tasksCompleted: 45, tasksCreated: 25 },
  { month: "Feb", tasksCompleted: 25, tasksCreated: 30 },
  { month: "Mar", tasksCompleted: 15, tasksCreated: 38 },
  { month: "Apr", tasksCompleted: 25, tasksCreated: 42 },
  { month: "May", tasksCompleted: 30, tasksCreated: 45 },
];

// Project status data
const projectStatusDataSeed = [
  { name: "Ongoing", value: 10, color: "#3B82F6" },
  { name: "Finished", value: 5, color: "#10B981" },
  { name: "On Hold", value: 5, color: "#F59E0B" },
];

// Task priority data
const taskPriorityDataSeed = [
  { name: "High", value: 59, color: "#EF4444" },
  { name: "Medium", value: 81, color: "#F59E0B" },
  { name: "Low", value: 14, color: "#10B981" },
];

// Team performance data
const teamPerformanceDataSeed = [
  {
    name: "John Smith",
    completed: 58,
    total: 74,
    percentage: 78,
  },
  {
    name: "Michael Brown",
    completed: 22,
    total: 31,
    percentage: 71,
  },
  {
    name: "David Wilson",
    completed: 34,
    total: 51,
    percentage: 67,
  },
  {
    name: "Robert Taylor",
    completed: 18,
    total: 37,
    percentage: 49,
  },
  {
    name: "James Garcia",
    completed: 11,
    total: 24,
    percentage: 46,
  },
];

// Recent tasks data
const recentTasksSeed = [
  {
    id: 1,
    name: "Responsive Design",
    priority: "Medium",
    stage: "Todo",
  },
  {
    id: 2,
    name: "Resource Planning",
    priority: "Medium",
    stage: "Todo",
  },
  {
    id: 3,
    name: "Risk Assessment",
    priority: "Medium",
    stage: "Todo",
  },
  {
    id: 4,
    name: "User Interface Implementation",
    priority: "High",
    stage: "Done",
  },
];

export const ProjectDashboard: React.FC = () => {
  const [monthlyProgressData, setMonthlyProgressData] = useState(monthlyProgressDataSeed);
  const [projectStatusData, setProjectStatusData] = useState(projectStatusDataSeed);
  const [taskPriorityData, setTaskPriorityData] = useState(taskPriorityDataSeed);
  const [teamPerformanceData, setTeamPerformanceData] = useState<any[]>(teamPerformanceDataSeed);
  const [recentTasks, setRecentTasks] = useState<any[]>(recentTasksSeed);
  const [stats, setStats] = useState<any>({
    total_projects: 20,
    overdue_projects: 13,
    completion_rate: 66,
    completed_tasks: 101,
    total_tasks: 154,
    total_bugs: 41,
    total_users: 10,
    total_clients: 25,
  });
  const [bugStats, setBugStats] = useState<any>({ open: 41, resolved: 9 });

  useEffect(() => {
    let alive = true;
    api
      .get("/project/dashboard/home")
      .then((res: any) => {
        if (!alive) return;
        const d = toObject<any>(res?.data ?? res) || {};
        if (d.stats) setStats(d.stats);
        if (d.bugStats) setBugStats(d.bugStats);
        if (d.projectStatus?.length) setProjectStatusData(d.projectStatus);
        if (d.taskPriority?.length) setTaskPriorityData(d.taskPriority);
        if (d.teamPerformance?.length) setTeamPerformanceData(d.teamPerformance);
        if (d.recentTasks?.length) setRecentTasks(d.recentTasks);
        if (d.monthlyProgress?.length)
          setMonthlyProgressData(
            d.monthlyProgress.map((m: any) => ({
              month: m.month,
              tasksCompleted: Number(m.completed) || 0,
              tasksCreated: Number(m.created) || 0,
            })),
          );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-500";
      case "Medium":
        return "bg-yellow-500";
      case "Low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Done":
        return "bg-green-500";
      case "Todo":
        return "bg-blue-500";
      case "In Progress":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Project Dashboard
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* Total Projects */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-blue-400">Total Projects</div>
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-blue-200 mb-1">{stats.total_projects ?? 0}</div>
            <div className="text-xs text-blue-400">{stats.overdue_projects ?? 0} overdue</div>
          </div>

          {/* Task Completion */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-emerald-400">Task Completion</div>
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-200 mb-1">{stats.completion_rate ?? 0}%</div>
            <div className="text-xs text-emerald-400">{stats.completed_tasks ?? 0}/{stats.total_tasks ?? 0} completed</div>
          </div>

          {/* Active Bugs */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-red-400">Active Bugs</div>
              <Bug className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-200 mb-1">{bugStats.open ?? stats.total_bugs ?? 0}</div>
            <div className="text-xs text-red-400">{bugStats.resolved ?? 0} resolved</div>
          </div>

          {/* Team Members */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-purple-400">Team Members</div>
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-200 mb-1">{stats.total_users ?? 0}</div>
            <div className="text-xs text-purple-400">Staff members</div>
          </div>

          {/* Total Clients */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-orange-400">Total Clients</div>
              <UserCheck className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-200 mb-1">{stats.total_clients ?? 0}</div>
            <div className="text-xs text-orange-400">Active clients</div>
          </div>
        </div>

        {/* Company Monthly Progress Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Company Monthly Progress
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyProgressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "12px" }} iconType="line" />
              <Line
                type="monotone"
                dataKey="tasksCompleted"
                stroke="#10B981"
                strokeWidth={2}
                name="Tasks Completed"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="tasksCreated"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Tasks Created"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Row - 3 Cards */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Project Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Project Status
            </h2>
            <div className="flex items-center justify-center mb-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {projectStatusData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Task Priority */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Task Priority
            </h2>
            <div className="flex items-center justify-center mb-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={taskPriorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskPriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {taskPriorityData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Team Performance
            </h2>
            <div className="space-y-4">
              {teamPerformanceData.map((member) => (
                <div key={member.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{member.name}</span>
                    <span className="text-sm text-gray-500">
                      {member.completed}/{member.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${member.percentage}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {member.percentage}% completed
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Company Tasks */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Company Tasks
            </h2>
            <span className="text-sm text-gray-500">
              101 of 154 tasks completed across all projects
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-gray-900 mb-3">{task.name}</h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Priority:</div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${getPriorityColor(
                        task.priority,
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Stage:</div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${getStageColor(
                        task.stage,
                      )}`}
                    >
                      {task.stage}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
