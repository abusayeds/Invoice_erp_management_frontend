/**
 * File: src/pages/hrm/payslip/Payroll.tsx
 * Manage Payrolls — list + Create/Edit Payroll modal matching the ERPGO
 * reference (references/hrm/payroll/payroll page.png + create payraoll.png)
 * in the Qayd blue theme. Payrolls persist in meta row `hrm:payrolls`;
 * Net Pay / Employee Count are computed live from the employee register and
 * per-employee salary structures.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../utils/toast";
import { money } from "@/lib/db";
import {
  usePayrolls,
  savePayrolls,
  usePayrollPay,
  newUid,
  BANK_ACCOUNTS,
  type PayrollRecord,
} from "@/lib/db/hrm";
import { Chip, Field, inputCls, HrmBreadcrumb } from "../hrmShared";
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Play,
  X,
} from "lucide-react";

type SortField = "title" | "frequency" | "periodStart" | "periodEnd" | "payDate" | "status";

const emptyDraft = () => ({
  id: "",
  title: "",
  frequency: "Weekly" as PayrollRecord["frequency"],
  periodStart: "",
  periodEnd: "",
  payDate: "",
  bankAccount: "",
  notes: "",
});

export const Payroll: React.FC = () => {
  const navigate = useNavigate();
  const payrolls = usePayrolls();
  useEffect(() => {
  }, [payrolls]);

  const pay = usePayrollPay(); // all-employee rows (no exclusions) for list totals
  const totalNet = (pay || []).reduce((s, r) => s + r.net, 0);
  const employeeCount = (pay || []).length;

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState<SortField>("payDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<PayrollRecord | null>(null);

  const list = payrolls || [];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const rows = list.filter(
      (p) =>
        (statusFilter === "All" || p.status === statusFilter) &&
        p.title.toLowerCase().includes(q),
    );
    rows.sort((a, b) => {
      const va = String(a[sortField] ?? "");
      const vb = String(b[sortField] ?? "");
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return rows;
  }, [list, searchQuery, statusFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortAsc(!sortAsc);
    else {
      setSortField(f);
      setSortAsc(true);
    }
  };

  const submit = async () => {
    if (!draft.title || !draft.periodStart || !draft.periodEnd || !draft.payDate || !draft.bankAccount) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (modal === "edit") {
      await savePayrolls(list.map((p) => (p.id === draft.id ? { ...p, ...draft } : p)));
      showToast("Payroll updated successfully", "success");
    } else {
      const rec: PayrollRecord = { ...draft, id: newUid(), status: "Draft", paid: [], excluded: [] };
      await savePayrolls([rec, ...list]);
      showToast("Payroll created successfully", "success");
    }
    setModal(null);
  };

  const runPayroll = async (p: PayrollRecord) => {
    if (p.status === "Completed") {
      showToast("Payroll already completed", "info");
      return;
    }
    await savePayrolls(list.map((r) => (r.id === p.id ? { ...r, status: "Completed" } : r)));
    showToast("Payroll run completed", "success");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await savePayrolls(list.filter((p) => p.id !== deleteTarget.id));
    showToast("Payroll deleted successfully", "success");
    setDeleteTarget(null);
  };

  const paymentStatus = (p: PayrollRecord) =>
    p.status !== "Completed" ? "Unpaid" : p.paid.length >= employeeCount && employeeCount > 0 ? "Paid" : "Unpaid";

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
      <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-gray-900">
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </button>
    </th>
  );

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      <HrmBreadcrumb trail={[{ label: "Dashboard", to: "/" }, { label: "HRM" }]} current="Payrolls" onNavigate={navigate} />

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Payrolls</h2>
          <button
            onClick={() => {
              setDraft(emptyDraft());
              setModal("create");
            }}
            title="Create payroll"
            className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Payrolls..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={() => showToast("Search applied", "info")}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                <span>Filters</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showFilters && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">Status</div>
                  {["All", "Completed", "Draft"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setPage(1);
                        setShowFilters(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${statusFilter === s ? "text-blue-600 font-medium" : "text-gray-700"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <SortHeader field="title" label="Title" />
                <SortHeader field="frequency" label="Payroll Frequency" />
                <SortHeader field="periodStart" label="Pay Period Start" />
                <SortHeader field="periodEnd" label="Pay Period End" />
                <SortHeader field="payDate" label="Pay Date" />
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Total Net Pay</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Employee Count</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Payment Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginated.map((p) => {
                const completed = p.status === "Completed";
                const excludedCount = p.excluded?.length || 0;
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/hrm/payslip/payroll/${p.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">{p.frequency}</td>
                    <td className="px-4 py-3 text-gray-600">{p.periodStart}</td>
                    <td className="px-4 py-3 text-gray-600">{p.periodEnd}</td>
                    <td className="px-4 py-3 text-gray-600">{p.payDate}</td>
                    <td className="px-4 py-3"><Chip label={p.status} /></td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {completed ? money(totalNet) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {completed ? Math.max(0, employeeCount - excludedCount) : "-"}
                    </td>
                    <td className="px-4 py-3"><Chip label={paymentStatus(p)} /></td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => runPayroll(p)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50" title="Run payroll">
                          <Play className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/hrm/payslip/payroll/${p.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDraft({
                              id: p.id,
                              title: p.title,
                              frequency: p.frequency,
                              periodStart: p.periodStart,
                              periodEnd: p.periodEnd,
                              payDate: p.payDate,
                              bankAccount: p.bankAccount || "",
                              notes: p.notes || "",
                            });
                            setModal("edit");
                          }}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    No payrolls found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* footer */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {filtered.length} results
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 disabled:opacity-40 hover:bg-gray-50"
          >
            ‹ Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-md ${p === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50 border border-gray-300"}`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 disabled:opacity-40 hover:bg-gray-50"
          >
            Next ›
          </button>
        </div>
      </div>

      {/* create / edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{modal === "edit" ? "Edit Payroll" : "Create Payroll"}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Title" required>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Enter Title" className={inputCls} />
              </Field>
              <Field label="Payroll Frequency" required>
                <select
                  value={draft.frequency}
                  onChange={(e) => setDraft({ ...draft, frequency: e.target.value as PayrollRecord["frequency"] })}
                  className={`${inputCls} bg-white`}
                >
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </Field>
              <Field label="Pay Period Start" required>
                <input type="date" value={draft.periodStart} onChange={(e) => setDraft({ ...draft, periodStart: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Pay Period End" required>
                <input type="date" value={draft.periodEnd} onChange={(e) => setDraft({ ...draft, periodEnd: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Pay Date" required>
                <input type="date" value={draft.payDate} onChange={(e) => setDraft({ ...draft, payDate: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Bank Account" required>
                <select value={draft.bankAccount} onChange={(e) => setDraft({ ...draft, bankAccount: e.target.value })} className={`${inputCls} bg-white`}>
                  <option value="">Select Bank Account</option>
                  {BANK_ACCOUNTS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Enter Notes" rows={3} className={inputCls} />
              </Field>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                {modal === "edit" ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Payroll?</h3>
              <p className="text-sm text-gray-500 mb-5">
                This will permanently remove <span className="font-medium text-gray-700">{deleteTarget.title}</span>.
              </p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                  Delete
                </button>
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
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
