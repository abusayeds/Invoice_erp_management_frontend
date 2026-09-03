/**
 * File: src/pages/hrm/Promotions.tsx
 * Manage Promotions — matches the ERPGO reference
 * (references/hrm/promotions/*.png) in the Qayd blue theme, including the
 * Career Progression timeline in the details modal.
 * Promotions persist in meta row `hrm:promotions`.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import {
  usePromotions,
  savePromotions,
  useEmployees,
  HRM_BRANCHES,
  HRM_DEPARTMENTS,
  HRM_DESIGNATIONS,
  type Promotion,
} from "@/lib/db/hrm";
import { Field, inputCls, SearchSelect, Chip, HrmBreadcrumb } from "./hrmShared";
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
  Upload,
  UserRound,
  Calendar,
  Briefcase,
} from "lucide-react";

const emptyDraft = () => ({
  id: "",
  employee: "",
  branch: "",
  department: "",
  designation: "",
  effectiveDate: "",
  reason: "",
  document: "",
});

export const Promotions: React.FC = () => {
  const navigate = useNavigate();
  const promotions = usePromotions();
  const employees = useEmployees();
  useEffect(() => {
  }, [promotions]);
  useEffect(() => {
  }, [employees]);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [viewPromotion, setViewPromotion] = useState<Promotion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const list = promotions || [];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        (statusFilter === "All" || p.status === statusFilter) &&
        (p.employee.toLowerCase().includes(q) || p.designation.toLowerCase().includes(q)),
    );
  }, [list, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const submit = async () => {
    if (!draft.employee || !draft.branch || !draft.department || !draft.designation || !draft.effectiveDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (modal === "edit") {
      await savePromotions(list.map((p) => (p.id === draft.id ? { ...p, ...draft } : p)));
      showToast("Promotion updated successfully", "success");
    } else {
      const emp = (employees || []).find((e) => e.name === draft.employee);
      const rec: Promotion = {
        ...draft,
        id: "pr" + Math.random().toString(36).slice(2, 8),
        prevBranch: emp?.branch || "—",
        prevDepartment: emp?.department || "—",
        prevDesignation: emp?.designation || "—",
        status: "Pending",
        reason: draft.reason || "Promotion request",
      };
      await savePromotions([rec, ...list]);
      showToast("Promotion created successfully", "success");
    }
    setModal(null);
  };

  const approve = async (p: Promotion) => {
    if (p.status === "Approved") {
      showToast("Promotion already approved", "info");
      return;
    }
    await savePromotions(
      list.map((r) => (r.id === p.id ? { ...r, status: "Approved", approvedBy: "Company" } : r)),
    );
    showToast("Promotion approved", "success");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await savePromotions(list.filter((p) => p.id !== deleteTarget.id));
    showToast("Promotion deleted successfully", "success");
    setDeleteTarget(null);
  };

  return (
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col">
      <HrmBreadcrumb trail={[{ label: "Dashboard", to: "/" }, { label: "HRM" }]} current="Promotions" onNavigate={navigate} />

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Promotions</h2>
          <button
            onClick={() => {
              setDraft(emptyDraft());
              setModal("create");
            }}
            title="Create promotion"
            className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* toolbar */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Promotions..."
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
                  {["All", "Approved", "Pending"].map((s) => (
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
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                {["Employee", "Previous Branch", "Current Branch", "Current Designation", "Effective Date", "Status", "Approved By", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginated.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewPromotion(p)}>
                  <td className="px-4 py-3.5 font-medium text-gray-900">{p.employee}</td>
                  <td className="px-4 py-3.5 text-gray-600">{p.prevBranch}</td>
                  <td className="px-4 py-3.5 text-gray-600">{p.branch}</td>
                  <td className="px-4 py-3.5 text-gray-600">{p.designation}</td>
                  <td className="px-4 py-3.5 text-gray-600">{p.effectiveDate}</td>
                  <td className="px-4 py-3.5"><Chip label={p.status} /></td>
                  <td className="px-4 py-3.5 text-gray-600">{p.approvedBy || "-"}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {p.status === "Pending" ? (
                        <button onClick={() => approve(p)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50" title="Approve">
                          <Play className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */
                      )}
                      <button onClick={() => setViewPromotion(p)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDraft({ id: p.id, employee: p.employee, branch: p.branch, department: p.department, designation: p.designation, effectiveDate: p.effectiveDate, reason: p.reason, document: p.document || "" });
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
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">No promotions found.</td>
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
              <h3 className="text-lg font-semibold text-gray-900">{modal === "edit" ? "Edit Promotion" : "Create Promotion"}</h3>
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
              <Field label="Current Branch" required>
                <SearchSelect
                  value={draft.branch}
                  onChange={(v) => setDraft({ ...draft, branch: v, department: "", designation: "" })}
                  options={HRM_BRANCHES}
                  placeholder="Select Current Branch"
                />
              </Field>
              <Field label="Current Department" required>
                <SearchSelect
                  value={draft.department}
                  onChange={(v) => setDraft({ ...draft, department: v, designation: "" })}
                  options={HRM_DEPARTMENTS}
                  placeholder="Select Current Department"
                  disabled={!draft.branch}
                  disabledPlaceholder="Select Branch first"
                />
              </Field>
              <Field label="Current Designation" required>
                <SearchSelect
                  value={draft.designation}
                  onChange={(v) => setDraft({ ...draft, designation: v })}
                  options={HRM_DESIGNATIONS}
                  placeholder="Select Current Designation"
                  disabled={!draft.department}
                  disabledPlaceholder="Select Department first"
                />
              </Field>
              <Field label="Effective Date" required>
                <input type="date" value={draft.effectiveDate} onChange={(e) => setDraft({ ...draft, effectiveDate: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Reason">
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
              <Field label="Document">
                <label className="flex gap-2">
                  <input value={draft.document} readOnly placeholder="Select Document" className={`flex-1 ${inputCls} bg-white cursor-pointer`} />
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

      {/* details modal — career progression */}
      {viewPromotion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <UserRound className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">Promotion Details</h3>
              </div>
              <div className="flex items-center gap-3">
                <Chip label={viewPromotion.status} />
                <button onClick={() => setViewPromotion(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* employee card */}
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                  <UserRound className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{viewPromotion.employee}</p>
                  <p className="text-sm text-gray-500">Employee</p>
                </div>
              </div>

              {/* career progression timeline */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-6">
                <h4 className="text-center text-base font-bold text-gray-900 mb-6">Career Progression</h4>
                <div className="relative">
                  <div className="absolute left-1/2 top-2 bottom-2 w-px bg-blue-200 -translate-x-1/2" />
                  {/* previous */}
                  <div className="relative flex items-center mb-8">
                    <div className="w-1/2 pr-8">
                      <div className="bg-white rounded-lg shadow-sm border-l-4 border-red-400 px-4 py-3 text-right">
                        <p className="text-sm font-bold text-red-500 mb-1">Previous Position</p>
                        <p className="text-sm text-gray-700">{viewPromotion.prevDesignation}</p>
                        <p className="text-sm text-gray-500">{viewPromotion.prevDepartment}</p>
                        <p className="text-sm text-gray-500">{viewPromotion.prevBranch}</p>
                      </div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 bg-red-400 rounded-full flex items-center justify-center ring-4 ring-white">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  {/* current */}
                  <div className="relative flex items-center justify-end">
                    <div className="w-1/2 pl-8">
                      <div className="bg-white rounded-lg shadow-sm border-l-4 border-green-500 px-4 py-3">
                        <p className="text-sm font-bold text-green-600 mb-1">Current Position</p>
                        <p className="text-sm text-gray-700">{viewPromotion.designation}</p>
                        <p className="text-sm text-gray-500">{viewPromotion.department}</p>
                        <p className="text-sm text-gray-500">{viewPromotion.branch}</p>
                      </div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center ring-4 ring-white">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* promotion details */}
              <div className="border border-gray-200 rounded-xl px-5 py-4">
                <h4 className="text-base font-semibold text-gray-900 mb-3">Promotion Details</h4>
                <div className="bg-blue-50/70 border border-blue-100 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Effective Date</p>
                    <p className="font-semibold text-gray-900">{viewPromotion.effectiveDate}</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">Reason for Promotion</p>
                  <p className="text-sm text-gray-700">{viewPromotion.reason}</p>
                </div>
                {viewPromotion.approvedBy && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <UserRound className="w-4 h-4 text-gray-400" />
                    Approved By: <span className="font-medium text-gray-900">{viewPromotion.approvedBy}</span>
                  </div>
                )}
              </div>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Promotion?</h3>
              <p className="text-sm text-gray-500 mb-5">
                This will permanently remove the promotion of <span className="font-medium text-gray-700">{deleteTarget.employee}</span>.
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
