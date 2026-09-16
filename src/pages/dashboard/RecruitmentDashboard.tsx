/**
 * Recruitment Dashboard — GET /api/v1/recruitment/dashboard
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRecruitmentDashboard } from "@/services/recruitmentApi";
import { Users, Briefcase, Calendar, UserCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type DashData = {
  stats?: {
    total_candidates?: number;
    open_positions?: number;
    interviews?: number;
    hired?: number;
  };
  statusOverview?: { name: string; value: number; color: string }[];
  hiringFunnel?: { stage: string; candidates: number; percentage: number; color: string }[];
  onboardingProgress?: { name: string; value: number; color: string }[];
  upcomingInterviews?: {
    candidate: string;
    position: string;
    date: string;
    time: string;
    status: string;
    avatar?: string;
  }[];
  recentCandidates?: {
    name: string;
    position: string;
    stage: string;
    appliedDate: string;
    avatar?: string;
  }[];
  openPositions?: {
    title: string;
    department: string;
    applicants: number;
    daysOpen: number;
    priority: string;
  }[];
};

export const RecruitmentDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["recruitment-dashboard"],
    queryFn: () => fetchRecruitmentDashboard() as Promise<DashData>,
  });

  const stats = data?.stats ?? {};
  const statusOverview = data?.statusOverview ?? [];
  const hiringFunnel = data?.hiringFunnel ?? [];
  const onboardingProgress = data?.onboardingProgress ?? [];
  const upcomingInterviews = data?.upcomingInterviews ?? [];
  const recentCandidates = data?.recentCandidates ?? [];
  const openPositions = data?.openPositions ?? [];

  const cards = [
    { label: "Total Candidates", value: stats.total_candidates ?? 0, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Open Positions", value: stats.open_positions ?? 0, icon: Briefcase, color: "bg-emerald-50 text-emerald-600" },
    { label: "Interviews", value: stats.interviews ?? 0, icon: Calendar, color: "bg-amber-50 text-amber-600" },
    { label: "Hired", value: stats.hired ?? 0, icon: UserCheck, color: "bg-violet-50 text-violet-600" },
  ];

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading recruitment dashboard…</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Recruitment Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Live pipeline from your recruitment data</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Candidate Status</h2>
          {statusOverview.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No candidate data</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusOverview} dataKey="value" nameKey="name" outerRadius={80} label>
                    {statusOverview.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Onboarding Progress</h2>
          {onboardingProgress.every((x) => !x.value) ? (
            <p className="text-sm text-gray-400 py-8 text-center">No onboarding data</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={onboardingProgress} dataKey="value" nameKey="name" outerRadius={80} label>
                    {onboardingProgress.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Hiring Funnel</h2>
        {hiringFunnel.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No funnel data</p>
        ) : (
          <div className="space-y-3">
            {hiringFunnel.map((f) => (
              <div key={f.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{f.stage}</span>
                  <span className="text-gray-500">
                    {f.candidates} ({f.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(f.percentage, 2)}%`, backgroundColor: f.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Upcoming Interviews</h2>
          {upcomingInterviews.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No upcoming interviews</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingInterviews.map((iv, i) => (
                <li key={i} className="py-3 flex items-center gap-3">
                  {iv.avatar ? (
                    <img src={iv.avatar} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{iv.candidate}</p>
                    <p className="text-xs text-gray-500 truncate">{iv.position}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{iv.date}</div>
                    <div>{iv.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Candidates</h2>
          {recentCandidates.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No candidates yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentCandidates.map((c, i) => (
                <li key={i} className="py-3 flex items-center gap-3">
                  {c.avatar ? (
                    <img src={c.avatar} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.position}</p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-gray-700">{c.stage}</div>
                    <div className="text-gray-400">{c.appliedDate}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Open Positions</h2>
        {openPositions.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No open positions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Applicants</th>
                  <th className="py-2 pr-3">Days open</th>
                  <th className="py-2">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openPositions.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{p.title}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{p.applicants}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{p.daysOpen}</td>
                    <td className="py-2.5 text-gray-600">{p.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitmentDashboard;
