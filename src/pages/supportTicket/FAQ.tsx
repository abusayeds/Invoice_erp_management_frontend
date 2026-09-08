/**
 * File: src/pages/support/FAQ.tsx
 * Manage FAQ:
 *   - List with Title (sortable), Description (truncated), Created (sortable), Actions
 *   - Search + 10-per-page selector (no Filters button - matches screenshot)
 *   - Upload icon + green + button in header
 *   - Edit modal: Question (required), Answer rich editor (required)
 *   - Add modal: same fields, empty
 *   - Delete confirmation
 *   - Pagination: Previous / numbered / Next
 */

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";
import { toArray } from "@/services/_http";
import {
  Globe,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaqItem {
  id: string; // backend _id
  question: string;
  answer: string;
  created: string;
}

type ModalMode = "add" | "edit" | null;

// Map a backend FAQ (GET /support/faq/all) → row shape. title=question, description=answer.
const mapFaq = (d: any): FaqItem => ({
  id: String(d._id),
  question: d.title ?? "",
  answer: d.description ?? "",
  created: d.createdAt
    ? new Date(d.createdAt).toISOString().slice(0, 16).replace("T", " ")
    : "",
});


// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncate = (text: string, len = 105) =>
  text.length > len ? text.slice(0, len) + "..." : text;

const SortIcon = () => (
  <span className="inline-flex flex-col ml-1 text-gray-400">
    <ChevronUp className="w-3 h-3 -mb-0.5" />
    <ChevronDown className="w-3 h-3" />
  </span>
);

// ─── Rich Toolbar ─────────────────────────────────────────────────────────────

const RichToolbar: React.FC = () => {
  const btn = "p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors";
  const ic = "w-3.5 h-3.5";
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-white">
      <button className={btn}>
        <Bold className={ic} />
      </button>
      <button className={btn}>
        <Italic className={ic} />
      </button>
      <button className={btn}>
        <Underline className={ic} />
      </button>
      <button className={btn}>
        <Strikethrough className={ic} />
      </button>
      <button className={btn}>
        <Highlighter className={ic} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button className={btn}>
        <AlignLeft className={ic} />
      </button>
      <button className={btn}>
        <AlignCenter className={ic} />
      </button>
      <button className={btn}>
        <AlignRight className={ic} />
      </button>
      <button className={btn}>
        <AlignJustify className={ic} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button className={btn}>
        <List className={ic} />
      </button>
      <button className={btn}>
        <ListOrdered className={ic} />
      </button>
      <button className={btn}>
        <Quote className={ic} />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button className={btn}>
        <Link2 className={ic} />
      </button>
      <button className="w-5 h-5 rounded bg-black flex-shrink-0" />
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button className={btn}>
        <Undo2 className={ic} />
      </button>
      <button className={btn}>
        <Redo2 className={ic} />
      </button>
    </div>
  );
};

// ─── Edit / Add Modal ─────────────────────────────────────────────────────────

interface ModalProps {
  mode: ModalMode;
  faq: FaqItem | null;
  onClose: () => void;
  onSave: (data: Partial<FaqItem>) => void;
}

const FaqModal: React.FC<ModalProps> = ({ mode, faq, onClose, onSave }) => {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");

  if (!mode) return null;

  const handleSubmit = () => {
    if (!question.trim() || !answer.trim()) return;
    onSave({ question: question.trim(), answer: answer.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "edit" ? "Edit FAQ" : "Add FAQ"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Question <span className="text-red-500">*</span>
            </label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border border-emerald-500 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Enter question"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Answer <span className="text-red-500">* *</span>
            </label>
            <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-emerald-500">
              <RichToolbar />
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={7}
                className="w-full px-3 py-2.5 text-sm outline-none resize-none leading-relaxed"
                placeholder="Enter answer..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
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

// ─── Delete Confirmation ──────────────────────────────────────────────────────

const DeleteModal: React.FC<{
  faq: FaqItem | null;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ faq, onClose, onConfirm }) => {
  if (!faq) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Delete FAQ</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">"{faq.question}"</span>?
          This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const FAQ: React.FC = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<FaqItem | null>(null);

  // Load real FAQs from the backend (GET /support/faq/all).
  const loadFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.raw.get("/support/faq/all");
      setFaqs(toArray<any>(res.data).map(mapFaq));
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  // Filter
  const filtered = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditingFaq(null);
    setModalMode("add");
  };

  const openEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    setModalMode("edit");
  };

  const handleSave = async (data: Partial<FaqItem>) => {
    // Backend fields: title=question, description=answer.
    const body = { title: data.question ?? "", description: data.answer ?? "" };
    try {
      if (modalMode === "add") {
        await api.raw.post("/support/faq/create", body);
      } else if (modalMode === "edit" && editingFaq) {
        await api.raw.patch(`/support/faq/${editingFaq.id}`, body);
      }
      await loadFaqs();
      setPage(1);
    } catch {
      /* keep modal-closed; a failed write simply leaves the list unchanged */
    }
  };

  const handleDelete = async () => {
    if (!deletingFaq) return;
    const target = deletingFaq;
    setDeletingFaq(null);
    setFaqs((prev) => prev.filter((f) => f.id !== target.id));
    const newTotal = filtered.length - 1;
    if (page > Math.ceil(newTotal / perPage)) {
      setPage((p) => Math.max(1, p - 1));
    }
    try {
      await api.raw.delete(`/support/faq/${target.id}`);
    } catch {
      loadFaqs();
    }
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      {/* Breadcrumb header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer transition-colors">
            Dashboard
          </span>
          <span className="text-gray-400">›</span>
          <span className="hover:text-gray-700 cursor-pointer transition-colors">
            Support Tickets
          </span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">FAQ</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
          <Globe className="w-4 h-4" />
          <span>en English</span>
        </div>
      </div>

      {/* Page title */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Manage FAQ</h1>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
              <Search className="w-4 h-4 text-gray-400 ml-3" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search FAQ..."
                className="px-3 py-2 text-sm outline-none w-52"
              />
            </div>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium">
              Search
            </button>
          </div>

          {/* Per page — right side only, no Filters button */}
          <div className="relative">
            <select className="appearance-none border border-gray-200 rounded-md pl-3 pr-8 py-2 text-sm bg-white text-gray-700 outline-none cursor-pointer">
              <option>10 per page</option>
              <option>25 per page</option>
              <option>50 per page</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-72">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Title <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Created <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((faq) => (
                <tr key={faq.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 text-gray-900 text-sm align-top">
                    {faq.question}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm align-top">
                    {truncate(faq.answer)}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap align-top">
                    {faq.created}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(faq)}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingFaq(faq)}
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
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading
                        FAQs…
                      </span>
                    ) : search ? (
                      "No FAQs found matching your search."
                    ) : (
                      "No FAQs yet. Click “Add FAQ” to create one."
                    )}
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
                  className={`w-8 h-8 text-sm rounded transition-colors ${
                    p === page
                      ? "bg-emerald-500 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
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
      <FaqModal
        mode={modalMode}
        faq={editingFaq}
        onClose={() => {
          setModalMode(null);
          setEditingFaq(null);
        }}
        onSave={handleSave}
      />
      <DeleteModal
        faq={deletingFaq}
        onClose={() => setDeletingFaq(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default FAQ;
