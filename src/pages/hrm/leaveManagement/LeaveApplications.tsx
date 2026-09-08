/**
 * File: src/pages/hrm/leaveManagement/LeaveApplications.tsx
 * Manage Leave Applications — matches the ERPGO reference
 * (references/hrm/leave application/*.png) in the Qayd blue theme.
 * Applications persist in meta row `hrm:leaveApps`; leave-type colors and
 * paid/unpaid chips come from the leave types store.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../utils/toast";
import {
  useLeaveApps,
  saveLeaveApps,
  useLeaveTypes,
  useEmployees,
  type LeaveApplication,
} from "@/lib/db/hrm";
import { Field, inputCls, SearchSelect, Chip, HrmBreadcrumb } from "../hrmShared";
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  X,
  Play,
  Sparkles,
  FileText,
  User,
  Clock,
  Tag,
  Calendar,
  CheckCircle,
  MessageSquare,
  Upload,
} from "lucide-react";

const emptyDraft = () => ({
  id: "",
  employee: "",
  leaveType: "",
  start: "",
  end: "",
  reason: "",
  document: "",
});

const dayCount = (start: string, end: string) => {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
};

export const LeaveApplications: React.FC = () => {
  const navigate = useNavigate();
  const apps = useLeaveApps();
  const leaveTypes = useLeaveTypes();
  const employees = useEmployees();
  useEffect(() => {
  }, [apps]);
  useEffect(() => {
  }, [leaveTypes]);
  useEffect(() => {
  }, [employees]);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [viewApp, setViewApp] = useState<LeaveApplication | null>(null);
  const [actionApp, setActionApp] = useState<LeaveApplication | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeaveApplication | null>(null);

  const list = apps || [];
  const types = leaveTypes || [];
  const typeOf = (name: string) => types.find((t) => t.name === name);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return list.filter(
      (a) =>
        (statusFilter === "All" || a.status === statusFilter) &&
        (a.employee.toLowerCase().includes(q) || a.leaveType.toLowerCase().includes(q)),
    );
  }, [list, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const submit = async () => {
    if (!draft.employee || !draft.leaveType || !draft.start || !draft.end || !draft.reason) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (modal === "edit") {
      await saveLeaveApps(
        list.map((a) =>
          a.id === draft.id ? { ...a, ...draft, days: dayCount(draft.start, draft.end) } : a,
        ),
      );
      showToast("Leave application updated successfully", "success");
    } else {
      const rec: LeaveApplication = {
        ...draft,
        id: "la" + Math.random().toString(36).slice(2, 8),
        days: dayCount(draft.start, draft.end),
        status: "Pending",
        appliedOn: new Date().toISOString().slice(0, 10),
      };
      await saveLeaveApps([rec, ...list]);
      showToast("Leave application created successfully", "success");
    }
    setModal(null);
  };

  const takeAction = async (status: "Approved" | "Rejected") => {
    if (!actionApp) return;
    await saveLeaveApps(
      list.map((a) =>
        a.id === actionApp.id
          ? {
              ...a,
              status,
              approvedBy: "Company",
              approvedAt: new Date().toISOString().slice(0, 10),
              comment: actionComment || undefined,
            }
          : a,
      ),
    );
    showToast(`Leave application ${status.toLowerCase()}`, "success");
    setActionApp(null);
    setActionComment("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await saveLeaveApps(list.filter((a) => a.id !== deleteTarget.id));
    showToast("Leave application deleted successfully", "success");
    setDeleteTarget(null);
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      <HrmBreadcrumb trail={[{ label: "Dashboard", to: "/" }, { label: "HRM" }]} current="Leave Applications" onNavigate={navigate} />

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Leave Applications</h2>
          <button
            onClick={() => {
              setDraft(emptyDraft());
              setModal("create");
            }}
            title="Create leave application"
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
                placeholder="Search LeaveApplications..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <button onClick={() => showToast("Search applied", "info")} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
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
            </select>
            <div className="relative">
              <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                <Filter className="w-4 h-4 text-gray-500" />
                <span>Filters</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showFilters && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">Status</div>
                  {["All", "Pending", "Approved", "Rejected"].map((s) => (
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
          <table className="w-full text-sm min-w-[1050px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                {["Employee", "Leave Type", "Start Date", "End Date", "Days", "Status", "Applied On", "Document", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginated.map((a) => {
                const t = typeOf(a.leaveType);
                return (
                  <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewApp(a)}>
                    <td className="px-4 py-3.5 font-medium text-gray-900">{a.employee}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t?.color || "#9CA3AF" }} />
                        <div>
                          <div className="text-gray-900">{a.leaveType}</div>
                          <span className={`inline-flex px-1.5 py-0 rounded text-[10px] font-medium ${t?.paid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {t?.paid ? "Paid" : "Unpaid"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{a.start}</td>
                    <td className="px-4 py-3.5 text-gray-600">{a.end}</td>
                    <td className="px-4 py-3.5 text-gray-600">{a.days}</td>
                    <td className="px-4 py-3.5"><Chip label={a.status} /></td>
                    <td className="px-4 py-3.5 text-gray-600">{a.appliedOn}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast("Document preview coming soon", "info");
                        }}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title={a.document || "Document"}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {a.status === "Pending" ? (
                          <>
                            <button
                              onClick={() => {
                                setActionApp(a);
                                setActionComment("");
                              }}
                              className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50"
                              title="Take action"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDraft({ id: a.id, employee: a.employee, leaveType: a.leaveType, start: a.start, end: a.end, reason: a.reason, document: a.document || "" });
                                setModal("edit");
                              }}
                              className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="w-7 h-7" /> {/* fixed slots keep action columns aligned */}
                            <span className="w-7 h-7" />
                          </>
                        )}
                        <button onClick={() => setViewApp(a)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">No leave applications found.</td>
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
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 disabled:opacity-40 hover:bg-gray-50">
            ‹ Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-md ${p === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50 border border-gray-300"}`}>
              {p}
            </button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 disabled:opacity-40 hover:bg-gray-50">
            Next ›
          </button>
        </div>
      </div>

      {/* create / edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{modal === "edit" ? "Edit Leave Application" : "Create Leave Application"}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Employee" required>
                <SearchSelect
                  value={draft.employee}
                  onChange={(v) => setDraft({ ...draft, employee: v })}
                  options={(employees || []).map((e) => e.name)}
                  placeholder="Select Employee"
                />
              </Field>
              <Field label="Leave Type" required>
                <SearchSelect
                  value={draft.leaveType}
                  onChange={(v) => setDraft({ ...draft, leaveType: v })}
                  options={types.map((t) => t.name)}
                  placeholder="Select Leave Type"
                />
              </Field>
              <Field label="Start Date" required>
                <input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={inputCls} />
              </Field>
              <Field label="End Date" required>
                <input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Reason" required>
                <div className="flex gap-2">
                  <textarea value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Enter Reason" rows={3} className={`flex-1 ${inputCls}`} />
                  <button
                    type="button"
                    title="AI assist"
                    onClick={() => showToast("AI suggestions coming soon", "info")}
                    className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-md text-blue-600 hover:bg-blue-50 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </Field>
              <Field label="Attachment">
                <label className="flex gap-2">
                  <input value={draft.document} readOnly placeholder="Select Attachment..." className={`flex-1 ${inputCls} bg-white cursor-pointer`} />
                  <span className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 flex items-center gap-1.5 cursor-pointer hover:bg-gray-50">
                    <Upload className="w-4 h-4" /> Browse
                  </span>
                  <input type="file" className="hidden" onChange={(e) => setDraft({ ...draft, document: e.target.files?.[0]?.name || "" })} />
                </label>
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

      {/* details modal */}
      {viewApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Leave Application Details</h3>
                  <p className="text-sm text-gray-500">{viewApp.employee}</p>
                </div>
              </div>
              <button onClick={() => setViewApp(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1"><User className="w-4 h-4" /> Employee</div>
                  <p className="font-semibold text-gray-900">{viewApp.employee}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Clock className="w-4 h-4" /> Total Days</div>
                  <p className="font-semibold text-gray-900">{viewApp.days}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Tag className="w-4 h-4" /> Leave Type</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: typeOf(viewApp.leaveType)?.color || "#9CA3AF" }} />
                    <span className="font-semibold text-gray-900">{viewApp.leaveType}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1"><CheckCircle className="w-4 h-4" /> Status</div>
                  <Chip label={viewApp.status} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Calendar className="w-4 h-4" /> Start Date</div>
                  <p className="font-semibold text-gray-900">{viewApp.start}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1"><User className="w-4 h-4" /> Approved By</div>
                  <p className="font-semibold text-gray-900">{viewApp.approvedBy || "-"}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Calendar className="w-4 h-4" /> End Date</div>
                  <p className="font-semibold text-gray-900">{viewApp.end}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Calendar className="w-4 h-4" /> Approved At</div>
                  <p className="font-semibold text-gray-900">{viewApp.approvedAt || "-"}</p>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1.5 text-sm"><FileText className="w-4 h-4" /> Reason</div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700">{viewApp.reason}</div>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1.5 text-sm"><MessageSquare className="w-4 h-4" /> Approver Comment</div>
                <div className="bg-blue-50/60 border border-blue-100 rounded-lg px-4 py-3 text-sm text-gray-700">{viewApp.comment || "-"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* take action modal */}
      {actionApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Leave Action</h3>
              <button onClick={() => setActionApp(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm">
                <p className="font-semibold text-gray-900">{actionApp.employee}</p>
                <p className="text-gray-500 mt-0.5">
                  {actionApp.leaveType} · {actionApp.start} → {actionApp.end} ({actionApp.days} {actionApp.days === 1 ? "day" : "days"})
                </p>
              </div>
              <Field label="Approver Comment">
                <textarea value={actionComment} onChange={(e) => setActionComment(e.target.value)} placeholder="Enter comment (optional)" rows={3} className={inputCls} />
              </Field>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => takeAction("Rejected")} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium">
                Reject
              </button>
              <button onClick={() => takeAction("Approved")} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                Approve
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
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Leave Application?</h3>
              <p className="text-sm text-gray-500 mb-5">
                This will permanently remove the {deleteTarget.leaveType.toLowerCase()} application by <span className="font-medium text-gray-700">{deleteTarget.employee}</span>.
              </p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
