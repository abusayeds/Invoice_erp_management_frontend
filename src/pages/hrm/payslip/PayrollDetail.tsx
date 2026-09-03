/**
 * File: src/pages/hrm/payslip/PayrollDetail.tsx
 * Payroll Details — matches the ERPGO reference
 * (references/hrm/payroll/payroll details.png + view payslip.png) in the
 * Qayd blue theme: header card, 4 stat tiles, employee salary breakdown table,
 * payslip modal (attendance summary / earnings / deductions / leave details)
 * and a jsPDF payslip download.
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { showToast } from "../../../utils/toast";
import { money } from "@/lib/db";
import {
  usePayrolls,
  savePayrolls,
  usePayrollPay,
  workingDays,
  type EmployeePay,
  type PayrollRecord,
} from "@/lib/db/hrm";
import { Chip, HrmBreadcrumb } from "../hrmShared";
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  Calculator,
  CreditCard,
  Download,
  Eye,
  Trash2,
  X,
  User,
  CalendarDays,
} from "lucide-react";

const email = (name: string) => name.toLowerCase().split(" ").join(".") + "@company.com";

/* ── payslip PDF (jsPDF, text layout) ──────────────────────────── */

async function downloadPayslip(payroll: PayrollRecord, row: EmployeePay) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const emp = row.employee;
  let y = 18;
  const line = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.text(label, 20, y);
    doc.text(value, 190, y, { align: "right" });
    y += 7;
  };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Payslip", 105, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${payroll.title} · ${payroll.periodStart} - ${payroll.periodEnd}`, 105, y, { align: "center" });
  y += 12;
  line("Employee", `${emp.name} (${emp.employeeId})`);
  line("Email", email(emp.name));
  line("Department", emp.department);
  line("Designation", emp.designation);
  line("Pay Date", payroll.payDate);
  y += 4;
  doc.setDrawColor(200);
  doc.line(20, y, 190, y);
  y += 8;
  line("Basic Salary", money(row.basic));
  for (const a of row.salary.allowances) {
    line(
      `  ${a.name}`,
      a.type === "Percentage" ? money((row.basic * a.amount) / 100) : money(a.amount),
    );
  }
  line("Gross Pay", money(row.gross), true);
  y += 4;
  for (const d of row.salary.deductions) {
    line(
      `  ${d.name}`,
      "-" + (d.type === "Percentage" ? money((row.basic * d.amount) / 100) : money(d.amount)),
    );
  }
  if (row.loans > 0) line("  Loan Repayments", "-" + money(row.loans));
  y += 4;
  doc.line(20, y, 190, y);
  y += 8;
  line("Net Pay", money(row.net), true);
  doc.save(`payslip-${emp.employeeId}.pdf`);
}

/* ── page ──────────────────────────────────────────────────────── */

const PayrollDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const payrolls = usePayrolls();
  useEffect(() => {
  }, [payrolls]);
  const payroll = (payrolls || []).find((p) => p.id === id);

  const rows = usePayrollPay(payroll?.excluded || []);
  const [payslip, setPayslip] = useState<EmployeePay | null>(null);
  const [removeTarget, setRemoveTarget] = useState<EmployeePay | null>(null);

  if (payrolls !== undefined && !payroll) {
    return (
      <div className="flex-1 bg-[#FAFBFC] flex flex-col items-center justify-center gap-3 text-gray-500">
        <p>Payroll not found.</p>
        <button onClick={() => navigate("/hrm/payslip/payroll")} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
          Back to Payrolls
        </button>
      </div>
    );
  }
  if (!payroll) return null;

  const gross = (rows || []).reduce((s, r) => s + r.gross, 0);
  const dedu = (rows || []).reduce((s, r) => s + r.deductions + r.loans, 0);
  const net = (rows || []).reduce((s, r) => s + r.net, 0);
  const paid = payroll.paid || [];

  const markPaid = async (row: EmployeePay) => {
    if (paid.includes(row.employee.id)) {
      showToast("Already marked as paid", "info");
      return;
    }
    await savePayrolls(
      (payrolls || []).map((p) => (p.id === payroll.id ? { ...p, paid: [...paid, row.employee.id] } : p)),
    );
    showToast(`Marked ${row.employee.name} as paid`, "success");
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    await savePayrolls(
      (payrolls || []).map((p) =>
        p.id === payroll.id ? { ...p, excluded: [...(p.excluded || []), removeTarget.employee.id] } : p,
      ),
    );
    showToast(`${removeTarget.employee.name} removed from this payroll`, "success");
    setRemoveTarget(null);
  };

  const wd = workingDays(payroll.periodStart, payroll.periodEnd);

  const statCards = [
    { label: "Employees", value: String((rows || []).length), icon: Users, cls: "bg-blue-50 border-blue-100", iconCls: "text-blue-600 bg-blue-100", valueCls: "text-blue-700" },
    { label: "Gross Pay", value: money(gross), icon: DollarSign, cls: "bg-green-50 border-green-100", iconCls: "text-green-600 bg-green-100", valueCls: "text-green-700" },
    { label: "Deductions", value: money(dedu), icon: Calculator, cls: "bg-red-50 border-red-100", iconCls: "text-red-500 bg-red-100", valueCls: "text-red-600" },
    { label: "Net Pay", value: money(net), icon: DollarSign, cls: "bg-purple-50 border-purple-100", iconCls: "text-purple-600 bg-purple-100", valueCls: "text-purple-700" },
  ];

  const th = "px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap";

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-y-auto">
      <HrmBreadcrumb
        trail={[{ label: "Dashboard", to: "/" }, { label: "HRM" }, { label: "Payrolls", to: "/hrm/payslip/payroll" }]}
        current={payroll.title}
        onNavigate={navigate}
      />

      <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Payroll Details</h2>
        <button
          onClick={() => navigate("/hrm/payslip/payroll")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-8 space-y-5">
        {/* header card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{payroll.title}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-0.5">
                  <span>{payroll.periodStart} - {payroll.periodEnd}</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Pay Date: <span className="text-gray-700">{payroll.payDate}</span>
                  </span>
                  <span>
                    Frequency: <span className="text-gray-700">{payroll.frequency}</span>
                  </span>
                </div>
              </div>
            </div>
            <Chip label={payroll.status} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((c) => (
              <div key={c.label} className={`border rounded-lg px-4 py-3 flex items-center gap-3 ${c.cls}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.iconCls}`}>
                  <c.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className={`text-lg font-bold truncate ${c.valueCls}`}>{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* employee salary details */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Employee Salary Details</h3>
              <p className="text-xs text-gray-500">Detailed breakdown of employee salaries and deductions</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className={th}>Employee</th>
                  <th className={th}>Basic Salary</th>
                  <th className={th}>Allowances</th>
                  <th className={th}>Manual OT</th>
                  <th className={th}>Attendance OT</th>
                  <th className={th}>Deductions</th>
                  <th className={th}>Loans</th>
                  <th className={th}>Gross Pay</th>
                  <th className={th}>Net Pay</th>
                  <th className={th}>Status</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(rows || []).map((r) => {
                  const isPaid = paid.includes(r.employee.id);
                  return (
                    <tr key={r.employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.employee.name}</div>
                        <div className="text-xs text-gray-400">{email(r.employee.name)}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{money(r.basic)}</td>
                      <td className="px-4 py-3 text-gray-700">{money(r.allowances)}</td>
                      <td className="px-4 py-3 text-gray-500">{money(r.manualOT)}</td>
                      <td className="px-4 py-3 text-gray-500">{money(r.attendanceOT)}</td>
                      <td className="px-4 py-3 text-gray-700">{money(r.deductions)}</td>
                      <td className="px-4 py-3 text-gray-700">{money(r.loans)}</td>
                      <td className="px-4 py-3 font-medium text-green-600">{money(r.gross)}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600">{money(r.net)}</td>
                      <td className="px-4 py-3"><Chip label={isPaid ? "Paid" : "Unpaid"} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => markPaid(r)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Mark as paid">
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button onClick={() => downloadPayslip(payroll, r)} className="p-1.5 text-gray-400 hover:text-orange-500 rounded hover:bg-orange-50" title="Download payslip">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => setPayslip(r)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="View payslip">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setRemoveTarget(r)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Remove from payroll">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(rows || []).length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                      No employees in this payroll.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── payslip modal ── */}
      {payslip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">Payslip - {payslip.employee.name}</h3>
              </div>
              <button onClick={() => setPayslip(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5 overflow-y-auto">
              {/* who / which run */}
              <div className="border border-gray-200 rounded-lg px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{payslip.employee.name}</p>
                  <p className="text-sm text-gray-500">{email(payslip.employee.name)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{payroll.title}</p>
                  <p className="text-sm text-gray-500">{payroll.periodStart} - {payroll.periodEnd}</p>
                </div>
              </div>

              {/* attendance summary */}
              <div className="border border-gray-200 rounded-lg px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-5 h-5 text-gray-600" />
                  <h4 className="text-base font-semibold text-gray-900">Attendance Summary</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {(
                    [
                      ["Working Days", String(wd), "bg-blue-50 text-blue-700"],
                      ["Present Days", "0.00", "bg-green-50 text-green-700"],
                      ["Half Days", "0.00", "bg-yellow-50 text-yellow-700"],
                      ["Absent Days", "0.00", "bg-red-50 text-red-600"],
                      ["Manual OT Hours", "0.00", "bg-purple-50 text-purple-700"],
                      ["Attendance OT Hours", "0.00", "bg-blue-50 text-blue-700"],
                    ] as const
                  ).map(([label, value, cls]) => (
                    <div key={label} className={`rounded-lg px-3 py-3 text-center ${cls.split(" ")[0]}`}>
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className={`text-lg font-bold ${cls.split(" ")[1]}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* earnings */}
              <div className="border border-gray-200 rounded-lg px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="text-base font-semibold text-green-600">Earnings</h4>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-700">Basic Salary</span>
                  <span className="font-semibold text-gray-900">{money(payslip.basic)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-700">Allowances</span>
                  <span className="font-semibold text-gray-900">{money(payslip.allowances)}</span>
                </div>
                <div className="pl-4 space-y-1 pb-2">
                  {payslip.salary.allowances.map((a) => (
                    <div key={a.id} className="flex justify-between text-sm text-gray-500">
                      <span>• {a.name}</span>
                      <span>{a.type === "Percentage" ? money((payslip.basic * a.amount) / 100) : money(a.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-2 border-t border-gray-100 text-sm">
                  <span className="font-medium text-gray-900">Gross Pay</span>
                  <span className="font-bold text-green-600">{money(payslip.gross)}</span>
                </div>
              </div>

              {/* deductions */}
              <div className="border border-gray-200 rounded-lg px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-5 h-5 text-red-500" />
                  <h4 className="text-base font-semibold text-red-500">Deductions</h4>
                </div>
                <div className="pl-1 space-y-1 pb-2">
                  {payslip.salary.deductions.map((d) => (
                    <div key={d.id} className="flex justify-between text-sm text-gray-500">
                      <span>• {d.name}</span>
                      <span>-{d.type === "Percentage" ? money((payslip.basic * d.amount) / 100) : money(d.amount)}</span>
                    </div>
                  ))}
                  {payslip.loans > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>• Loan Repayments</span>
                      <span>-{money(payslip.loans)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between py-2 border-t border-gray-100 text-sm">
                  <span className="font-medium text-gray-900">Total Deductions</span>
                  <span className="font-bold text-red-500">-{money(payslip.deductions + payslip.loans)}</span>
                </div>
              </div>

              {/* leave details */}
              <div className="border border-gray-200 rounded-lg px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-5 h-5 text-orange-500" />
                  <h4 className="text-base font-semibold text-orange-500">Leave Details</h4>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Paid Leave Days</span>
                  <span>
                    <span className="font-semibold text-blue-600">0.00 days</span>
                    <span className="text-gray-400 ml-3">No deduction</span>
                  </span>
                </div>
              </div>

              {/* net pay */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-5 py-4 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Net Pay</span>
                <span className="text-xl font-bold text-blue-700">{money(payslip.net)}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setPayslip(null)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                Close
              </button>
              <button
                onClick={() => downloadPayslip(payroll, payslip)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* remove confirm */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Remove from payroll?</h3>
              <p className="text-sm text-gray-500 mb-5">
                <span className="font-medium text-gray-700">{removeTarget.employee.name}</span> will be excluded from this payroll run only.
              </p>
              <div className="flex gap-3">
                <button onClick={confirmRemove} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                  Remove
                </button>
                <button onClick={() => setRemoveTarget(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollDetail;
