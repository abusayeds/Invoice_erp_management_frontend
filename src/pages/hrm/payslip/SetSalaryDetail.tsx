/**
 * File: src/pages/hrm/payslip/SetSalaryDetail.tsx
 * Employee Salary Details — matches the ERPGO reference
 * (references/hrm/set salary/set salary detail page.png + add allowance /
 * deduction / loan / overtime modals) in the Qayd blue theme.
 * Salary components persist per employee in meta row `hrm:salary:<id>`.
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { showToast } from "../../../utils/toast";
import { money } from "@/lib/db";
import {
  useEmployees,
  saveEmployees,
  useSalary,
  saveSalary,
  defaultSalaryFor,
  newUid,
  ALLOWANCE_TYPES,
  DEDUCTION_TYPES,
  LOAN_TYPES,
  type SalaryData,
  type SalaryComponent,
  type SalaryLoan,
  type SalaryOvertime,
} from "@/lib/db/hrm";
import { Avatar, Chip, Field, inputCls, SearchSelect, HrmBreadcrumb } from "../hrmShared";
import {
  ArrowLeft,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Pencil,
} from "lucide-react";

/* ── small building blocks ─────────────────────────────────────── */

function Panel({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        <button
          onClick={onAdd}
          className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700"
          title={`Add ${title.toLowerCase()}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

const th = "px-5 py-2.5 text-left text-xs font-medium text-gray-500";
const td = "px-5 py-3 text-sm";

function ModalShell({
  title,
  onClose,
  children,
  onSubmit,
  submitLabel,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const fmtAmount = (c: { type: string; amount: number }) =>
  c.type === "Percentage" ? `${c.amount.toFixed(2)}%` : money(c.amount);

/* ── page ──────────────────────────────────────────────────────── */

const SetSalaryDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const empId = Number(id);

  const employees = useEmployees();
  useEffect(() => {
  }, [employees]);
  const employee = (employees || []).find((e) => e.id === empId);

  const salary = useSalary(Number.isFinite(empId) ? empId : null);
  useEffect(() => {
    if (salary === null && Number.isFinite(empId)) saveSalary(empId, defaultSalaryFor(empId));
  }, [salary, empId]);

  type ModalState =
    | { kind: "allowance" | "deduction"; item?: SalaryComponent }
    | { kind: "loan"; item?: SalaryLoan }
    | { kind: "overtime"; item?: SalaryOvertime }
    | { kind: "viewLoan"; item: SalaryLoan }
    | { kind: "viewOvertime"; item: SalaryOvertime }
    | { kind: "basicSalary" }
    | null;
  const [modal, setModal] = useState<ModalState>(null);

  // draft fields shared across the small modals
  const [draft, setDraft] = useState<any>({});
  const openModal = (m: Exclude<ModalState, null>) => {
    setDraft("item" in m && m.item ? { ...m.item } : m.kind === "basicSalary" ? { amount: employee?.basicSalary ?? 0 } : { type: "" });
    setModal(m);
  };

  if (!employee) {
    return (
      <div className="flex-1 bg-[#FAFBFC] flex flex-col items-center justify-center gap-3 text-gray-500">
        <p>Employee not found.</p>
        <button onClick={() => navigate("/hrm/payslip/set-salary")} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
          Back to Set Salary
        </button>
      </div>
    );
  }

  const data: SalaryData = salary || defaultSalaryFor(empId);
  const save = (patch: Partial<SalaryData>) => saveSalary(empId, { ...data, ...patch });

  /* ── submit handlers ── */

  const submitComponent = async (kind: "allowance" | "deduction") => {
    if (!draft.name || !draft.type || !(Number(draft.amount) > 0)) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const listKey = kind === "allowance" ? "allowances" : "deductions";
    const rows = data[listKey] as SalaryComponent[];
    const item: SalaryComponent = { id: draft.id || newUid(), name: draft.name, type: draft.type, amount: Number(draft.amount) };
    await save({ [listKey]: draft.id ? rows.map((r) => (r.id === item.id ? item : r)) : [...rows, item] } as any);
    showToast(`${kind === "allowance" ? "Allowance" : "Deduction"} ${draft.id ? "updated" : "created"} successfully`, "success");
    setModal(null);
  };

  const submitLoan = async () => {
    if (!draft.title || !draft.loanType || !draft.type || !(Number(draft.amount) > 0) || !draft.startDate || !draft.endDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const item: SalaryLoan = {
      id: draft.id || newUid(),
      title: draft.title,
      loanType: draft.loanType,
      type: draft.type,
      amount: Number(draft.amount),
      startDate: draft.startDate,
      endDate: draft.endDate,
      reason: draft.reason || "",
    };
    await save({ loans: draft.id ? data.loans.map((r) => (r.id === item.id ? item : r)) : [...data.loans, item] });
    showToast(`Loan ${draft.id ? "updated" : "created"} successfully`, "success");
    setModal(null);
  };

  const submitOvertime = async () => {
    if (!draft.title || !(Number(draft.days) > 0) || !(Number(draft.hours) > 0) || !(Number(draft.rate) > 0) || !draft.startDate || !draft.endDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const item: SalaryOvertime = {
      id: draft.id || newUid(),
      title: draft.title,
      days: Number(draft.days),
      hours: Number(draft.hours),
      rate: Number(draft.rate),
      startDate: draft.startDate,
      endDate: draft.endDate,
      status: draft.status || "Active",
      notes: draft.notes || "",
    };
    await save({ overtimes: draft.id ? data.overtimes.map((r) => (r.id === item.id ? item : r)) : [...data.overtimes, item] });
    showToast(`Overtime ${draft.id ? "updated" : "created"} successfully`, "success");
    setModal(null);
  };

  const submitBasicSalary = async () => {
    const amount = Number(draft.amount);
    if (!(amount > 0)) {
      showToast("Enter a valid salary amount", "error");
      return;
    }
    await saveEmployees((employees || []).map((e) => (e.id === empId ? { ...e, basicSalary: amount } : e)));
    showToast("Basic salary updated", "success");
    setModal(null);
  };

  const removeRow = async (listKey: keyof SalaryData, rowId: string) => {
    await save({ [listKey]: (data[listKey] as { id: string }[]).filter((r) => r.id !== rowId) } as any);
    showToast("Deleted successfully", "success");
  };

  const actionBtns = (onView: (() => void) | null, onEdit: () => void, onDelete: () => void) => (
    <div className="flex items-center gap-1.5">
      {onView && (
        <button onClick={onView} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="View">
          <Eye className="w-4 h-4" />
        </button>
      )}
      <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Edit">
        <Edit className="w-4 h-4" />
      </button>
      <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-y-auto">
      <HrmBreadcrumb
        trail={[{ label: "Dashboard", to: "/" }, { label: "HRM" }, { label: "Set Salary", to: "/hrm/payslip/set-salary" }]}
        current="View Salary"
        onNavigate={navigate}
      />

      <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Employee Salary Details</h2>
        <button
          onClick={() => navigate("/hrm/payslip/set-salary")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-8 space-y-5">
        {/* header card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={employee.name} size={12} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
              <p className="text-xs text-gray-500">{employee.employeeId}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Basic Salary</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-600">{money(employee.basicSalary)}</span>
                  <button onClick={() => openModal({ kind: "basicSalary" })} className="text-gray-400 hover:text-blue-600" title="Edit basic salary">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {(
              [
                ["Branch", employee.branch],
                ["Department", employee.department],
                ["Designation", employee.designation],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">{k}</p>
                <p className="text-sm font-semibold text-gray-900">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* panels */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="Allowances" onAdd={() => openModal({ kind: "allowance" })}>
            <table className="w-full min-w-[420px]">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className={th}>Allowance Type</th>
                  <th className={th}>Type</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.allowances.map((a) => (
                  <tr key={a.id}>
                    <td className={`${td} text-gray-900`}>{a.name}</td>
                    <td className={`${td} text-gray-600`}>{a.type}</td>
                    <td className={`${td} text-gray-900`}>{fmtAmount(a)}</td>
                    <td className={td}>{actionBtns(null, () => openModal({ kind: "allowance", item: a }), () => removeRow("allowances", a.id))}</td>
                  </tr>
                ))}
                {data.allowances.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">No allowances yet.</td></tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Deductions" onAdd={() => openModal({ kind: "deduction" })}>
            <table className="w-full min-w-[420px]">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className={th}>Deduction Type</th>
                  <th className={th}>Type</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.deductions.map((d) => (
                  <tr key={d.id}>
                    <td className={`${td} text-gray-900`}>{d.name}</td>
                    <td className={`${td} text-gray-600`}>{d.type}</td>
                    <td className={`${td} text-gray-900`}>{fmtAmount(d)}</td>
                    <td className={td}>{actionBtns(null, () => openModal({ kind: "deduction", item: d }), () => removeRow("deductions", d.id))}</td>
                  </tr>
                ))}
                {data.deductions.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">No deductions yet.</td></tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Loans" onAdd={() => openModal({ kind: "loan" })}>
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className={th}>Type</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Start Date</th>
                  <th className={th}>End Date</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.loans.map((l) => (
                  <tr key={l.id}>
                    <td className={`${td} text-gray-900`}>{l.loanType}</td>
                    <td className={`${td} text-gray-900`}>{fmtAmount(l)}</td>
                    <td className={`${td} text-gray-600`}>{l.startDate}</td>
                    <td className={`${td} text-gray-600`}>{l.endDate}</td>
                    <td className={td}>{actionBtns(() => setModal({ kind: "viewLoan", item: l }), () => openModal({ kind: "loan", item: l }), () => removeRow("loans", l.id))}</td>
                  </tr>
                ))}
                {data.loans.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No loans yet.</td></tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Overtimes" onAdd={() => openModal({ kind: "overtime" })}>
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className={th}>Title</th>
                  <th className={th}>Days</th>
                  <th className={th}>Hours</th>
                  <th className={th}>Rate</th>
                  <th className={th}>Status</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.overtimes.map((o) => (
                  <tr key={o.id}>
                    <td className={`${td} text-gray-900`}>{o.title}</td>
                    <td className={`${td} text-gray-600`}>{o.days}</td>
                    <td className={`${td} text-gray-600`}>{o.hours.toFixed(2)}</td>
                    <td className={`${td} text-gray-600`}>{money(o.rate)}</td>
                    <td className={td}><Chip label={o.status} /></td>
                    <td className={td}>{actionBtns(() => setModal({ kind: "viewOvertime", item: o }), () => openModal({ kind: "overtime", item: o }), () => removeRow("overtimes", o.id))}</td>
                  </tr>
                ))}
                {data.overtimes.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No overtimes yet.</td></tr>
                )}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>

      {/* ── modals ── */}

      {modal?.kind === "basicSalary" && (
        <ModalShell title="Edit Basic Salary" onClose={() => setModal(null)} onSubmit={submitBasicSalary} submitLabel="Update">
          <Field label="Basic Salary" required>
            <input type="number" min={0} value={draft.amount ?? ""} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="Enter basic salary" className={inputCls} />
          </Field>
        </ModalShell>
      )}

      {(modal?.kind === "allowance" || modal?.kind === "deduction") && (
        <ModalShell
          title={`${modal.item ? "Edit" : "Add"} ${modal.kind === "allowance" ? "Allowance" : "Deduction"}`}
          onClose={() => setModal(null)}
          onSubmit={() => submitComponent(modal.kind)}
          submitLabel={modal.item ? "Update" : "Create"}
        >
          <Field label={modal.kind === "allowance" ? "Allowance Type" : "Deduction Type"} required>
            <SearchSelect
              value={draft.name || ""}
              onChange={(v) => setDraft({ ...draft, name: v })}
              options={modal.kind === "allowance" ? ALLOWANCE_TYPES : DEDUCTION_TYPES}
              placeholder={`Select ${modal.kind} type`}
            />
          </Field>
          <Field label="Type" required>
            <select value={draft.type || ""} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={`${inputCls} bg-white`}>
              <option value="">Select type</option>
              <option>Fixed</option>
              <option>Percentage</option>
            </select>
          </Field>
          <Field label="Amount" required>
            <input type="number" min={0} value={draft.amount ?? ""} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="Enter amount" className={inputCls} />
          </Field>
        </ModalShell>
      )}

      {modal?.kind === "loan" && (
        <ModalShell title={modal.item ? "Edit Loan" : "Add Loan"} onClose={() => setModal(null)} onSubmit={submitLoan} submitLabel={modal.item ? "Update" : "Create"}>
          <Field label="Title" required>
            <input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Enter loan title" className={inputCls} />
          </Field>
          <Field label="Loan Type" required>
            <SearchSelect value={draft.loanType || ""} onChange={(v) => setDraft({ ...draft, loanType: v })} options={LOAN_TYPES} placeholder="Select loan type" />
          </Field>
          <Field label="Type" required>
            <select value={draft.type || ""} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={`${inputCls} bg-white`}>
              <option value="">Select type</option>
              <option>Fixed</option>
              <option>Percentage</option>
            </select>
          </Field>
          <Field label="Amount" required>
            <input type="number" min={0} value={draft.amount ?? ""} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="Enter amount" className={inputCls} />
          </Field>
          <Field label="Start Date" required>
            <input type="date" value={draft.startDate || ""} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="End Date" required>
            <input type="date" value={draft.endDate || ""} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Reason">
            <textarea value={draft.reason || ""} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Enter reason for loan" rows={3} className={inputCls} />
          </Field>
        </ModalShell>
      )}

      {modal?.kind === "overtime" && (
        <ModalShell title={modal.item ? "Edit Overtime" : "Add Overtime"} onClose={() => setModal(null)} onSubmit={submitOvertime} submitLabel={modal.item ? "Update" : "Create"}>
          <Field label="Title" required>
            <input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Enter overtime title" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total Days" required>
              <input type="number" min={0} value={draft.days ?? ""} onChange={(e) => setDraft({ ...draft, days: e.target.value })} placeholder="Enter total days" className={inputCls} />
            </Field>
            <Field label="Hours" required>
              <input type="number" min={0} value={draft.hours ?? ""} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="Enter hours" className={inputCls} />
            </Field>
          </div>
          <Field label="Rate" required>
            <input type="number" min={0} value={draft.rate ?? ""} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} placeholder="Enter rate" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" required>
              <input type="date" value={draft.startDate || ""} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="End Date" required>
              <input type="date" value={draft.endDate || ""} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Status" required>
            <select value={draft.status || "Active"} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputCls} bg-white`}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
          <Field label="Notes">
            <textarea value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Enter notes for overtime" rows={3} className={inputCls} />
          </Field>
        </ModalShell>
      )}

      {modal?.kind === "viewLoan" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-2.5 text-sm">
              {(
                [
                  ["Title", modal.item.title],
                  ["Loan Type", modal.item.loanType],
                  ["Type", modal.item.type],
                  ["Amount", fmtAmount(modal.item)],
                  ["Start Date", modal.item.startDate],
                  ["End Date", modal.item.endDate],
                  ["Reason", modal.item.reason || "—"],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-900 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal?.kind === "viewOvertime" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Overtime Details</h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-2.5 text-sm">
              {(
                [
                  ["Title", modal.item.title],
                  ["Total Days", String(modal.item.days)],
                  ["Hours", modal.item.hours.toFixed(2)],
                  ["Rate", money(modal.item.rate)],
                  ["Start Date", modal.item.startDate],
                  ["End Date", modal.item.endDate],
                  ["Status", modal.item.status],
                  ["Notes", modal.item.notes || "—"],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-900 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetSalaryDetail;
