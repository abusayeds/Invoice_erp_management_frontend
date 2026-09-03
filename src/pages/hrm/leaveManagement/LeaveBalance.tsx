/**
 * File: src/pages/hrm/leaveManagement/LeaveBalance.tsx
 * Leave Balance — per-employee cards matching the ERPGO reference
 * (references/hrm/leave balance/leave balance.png) in the Qayd blue theme.
 * Used days are computed live from APPROVED leave applications, so approving
 * an application on the Leave Applications page updates this view instantly.
 */

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useEmployees,
  useLeaveTypes,
  useLeaveApps,
} from "@/lib/db/hrm";
import { HrmBreadcrumb } from "../hrmShared";
import { UserRound } from "lucide-react";

export const LeaveBalance: React.FC = () => {
  const navigate = useNavigate();
  const employees = useEmployees();
  const leaveTypes = useLeaveTypes();
  const apps = useLeaveApps();
  useEffect(() => {
  }, [employees]);
  useEffect(() => {
  }, [leaveTypes]);
  useEffect(() => {
  }, [apps]);

  const types = leaveTypes || [];
  const usedFor = (employee: string, leaveType: string) =>
    (apps || [])
      .filter((a) => a.employee === employee && a.leaveType === leaveType && a.status === "Approved")
      .reduce((s, a) => s + a.days, 0);

  return (
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm overflow-y-auto">
      <HrmBreadcrumb trail={[{ label: "Dashboard", to: "/" }, { label: "HRM" }]} current="Leave Balance" onNavigate={navigate} />

      <div className="px-4 sm:px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Leave Balance</h2>
      </div>

      <div className="px-4 sm:px-6 pb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {(employees || []).map((emp) => (
          <div key={emp.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <UserRound className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{emp.name}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left font-medium pb-2">Leave Type</th>
                  <th className="text-right font-medium pb-2">Total</th>
                  <th className="text-right font-medium pb-2">Used</th>
                  <th className="text-right font-medium pb-2">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {types.map((t) => {
                  const used = usedFor(emp.name, t.name);
                  return (
                    <tr key={t.id} className="odd:bg-gray-50/50">
                      <td className="py-2.5 pr-2 text-gray-700">{t.name}</td>
                      <td className="py-2.5 text-right text-gray-900">{t.maxDays}</td>
                      <td className={`py-2.5 text-right font-medium ${used > 0 ? "text-red-500" : "text-red-400"}`}>{used}</td>
                      <td className="py-2.5 text-right font-semibold text-blue-600">{Math.max(0, t.maxDays - used)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {(employees || []).length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">No employees found.</div>
        )}
      </div>
    </div>
  );
};
