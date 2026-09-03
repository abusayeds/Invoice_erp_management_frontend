/**
 * File: src/pages/contracts/ContractTypes.tsx
 * Manage Contract Types:
 *   - Table: Name (sortable) | Contracts (sortable, CON#### pills or "No contracts") | Status | Actions
 *   - Search by name or contract number + 10-per-page dropdown + Filters button
 *   - Green + Add button in page header
 *   - Status: Active (green) | Inactive (red/salmon)
 *   - Actions: blue edit pencil + red trash
 *   - Edit modal: Name* pre-filled + Status toggle → Cancel / Update
 *   - Add modal:  Name* empty  + Status toggle → Cancel / Save
 *   - Delete confirmation modal
 *   - Pagination: Previous / 1 / 2 / Next — 20 total results
 */

import React, { useState } from "react";
import {
  Globe,
  Plus,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractType {
  id: number;
  name: string;
  contracts: string[];
  active: boolean;
}

type ModalMode = "add" | "edit" | null;

// ─── Sample Data ──────────────────────────────────────────────────────────────

const initialTypes: ContractType[] = [
  { id: 1, name: "Software License Agreement", contracts: [], active: true },
  {
    id: 2,
    name: "Business Process Outsourcing (BPO)",
    contracts: [],
    active: false,
  },
  {
    id: 3,
    name: "Training & Education Contract",
    contracts: ["CON0009"],
    active: false,
  },
  { id: 4, name: "Security Services Agreement", contracts: [], active: true },
  { id: 5, name: "Hosting Services Contract", contracts: [], active: true },
  { id: 6, name: "API License Agreement", contracts: [], active: true },
  {
    id: 7,
    name: "Technology Partnership Agreement",
    contracts: [],
    active: true,
  },
  {
    id: 8,
    name: "Professional Services Contract",
    contracts: [],
    active: true,
  },
  {
    id: 9,
    name: "Vendor Service Agreement",
    contracts: ["CON0003", "CON0016"],
    active: true,
  },
  {
    id: 10,
    name: "Data Processing Agreement",
    contracts: ["CON0002", "CON0006", "CON0018", "CON0020"],
    active: true,
  },
  {
    id: 11,
    name: "Consulting Services Contract",
    contracts: ["CON0007", "CON0014", "CON0019"],
    active: true,
  },
  {
    id: 12,
    name: "Software Development Agreement",
    contracts: ["CON0004", "CON0010", "CON0017"],
    active: true,
  },
  {
    id: 13,
    name: "Statement of Work (SOW)",
    contracts: ["CON0002", "CON0015"],
    active: true,
  },
  {
    id: 14,
    name: "Digital Marketing Agreement",
    contracts: ["CON0013"],
    active: false,
  },
  {
    id: 15,
    name: "Maintenance & Support Agreement",
    contracts: ["CON0012"],
    active: true,
  },
  {
    id: 16,
    name: "IT Services Contract",
    contracts: ["CON0001", "CON0011"],
    active: true,
  },
  { id: 17, name: "Non-Disclosure Agreement", contracts: [], active: true },
  { id: 18, name: "Master Service Agreement", contracts: [], active: false },
  { id: 19, name: "Subcontractor Agreement", contracts: [], active: true },
  { id: 20, name: "Equipment Lease Agreement", contracts: [], active: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SortIcon = () => (
  <span className="inline-flex flex-col ml-1 text-gray-400">
    <ChevronUp className="w-3 h-3 -mb-0.5" />
    <ChevronDown className="w-3 h-3" />
  </span>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-gray-300"}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
    />
  </button>
);

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

const TypeModal: React.FC<{
  mode: ModalMode;
  item: ContractType | null;
  onClose: () => void;
  onSave: (name: string, active: boolean) => void;
}> = ({ mode, item, onClose, onSave }) => {
  const [name, setName] = useState(item?.name ?? "");
  const [active, setActive] = useState(item?.active ?? true);
  if (!mode) return null;
  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), active);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "edit" ? "Edit Contract Type" : "Add Contract Type"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-emerald-500 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Enter contract type name"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={active} onChange={setActive} />
            <span className="text-sm font-medium text-gray-700">Status</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium"
          >
            {mode === "edit" ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

const DeleteModal: React.FC<{
  item: ContractType | null;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ item, onClose, onConfirm }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Delete Contract Type
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">"{item.name}"</span>? This
          action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ContractTypes: React.FC = () => {
  const [types, setTypes] = useState<ContractType[]>(initialTypes);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingItem, setEditingItem] = useState<ContractType | null>(null);
  const [deletingItem, setDeletingItem] = useState<ContractType | null>(null);

  const filtered = types.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.contracts.some((c) => c.toLowerCase().includes(search.toLowerCase())),
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditingItem(null);
    setModalMode("add");
  };
  const openEdit = (item: ContractType) => {
    setEditingItem(item);
    setModalMode("edit");
  };

  const handleSave = (name: string, active: boolean) => {
    if (modalMode === "add") {
      setTypes((prev) => [
        ...prev,
        { id: Date.now(), name, contracts: [], active },
      ]);
    } else if (modalMode === "edit" && editingItem) {
      setTypes((prev) =>
        prev.map((t) => (t.id === editingItem.id ? { ...t, name, active } : t)),
      );
    }
    setPage(1);
  };

  const handleDelete = () => {
    if (!deletingItem) return;
    setTypes((prev) => prev.filter((t) => t.id !== deletingItem.id));
    setDeletingItem(null);
    const newTotal = filtered.length - 1;
    if (page > Math.ceil(newTotal / perPage))
      setPage((p) => Math.max(1, p - 1));
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer">Dashboard</span>
          <span className="text-gray-400">›</span>
          <span className="hover:text-gray-700 cursor-pointer">Contract</span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">Contract Types</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
          <Globe className="w-4 h-4" />
          <span>en English</span>
        </div>
      </div>

      {/* Page title */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Manage Contract Types
        </h1>
        <button
          onClick={openAdd}
          className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
              <Search className="w-4 h-4 text-gray-400 ml-3" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or contract number..."
                className="px-3 py-2 text-sm outline-none w-64"
              />
            </div>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium transition-colors">
              Search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select className="appearance-none border border-gray-200 rounded-md pl-3 pr-8 py-2 text-sm bg-white text-gray-700 outline-none cursor-pointer">
                <option>10 per page</option>
                <option>25 per page</option>
                <option>50 per page</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" /> Filters{" "}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-72">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Name <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Contracts <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-32">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3.5 text-gray-900 text-sm font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3.5">
                    {item.contracts.length === 0 ? (
                      <span className="text-gray-400 text-sm">
                        No contracts
                      </span>
                    ) : (
                      <div className="flex items-center flex-wrap gap-1.5">
                        {item.contracts.map((con) => (
                          <span
                            key={con}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-300 text-gray-700"
                          >
                            {con}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {item.active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-500 border border-red-200">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No contract types found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
              {Math.min(page * perPage, filtered.length)} of {filtered.length}{" "}
              results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded transition-colors ${p === page ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TypeModal
        mode={modalMode}
        item={editingItem}
        onClose={() => {
          setModalMode(null);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />
      <DeleteModal
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ContractTypes;
