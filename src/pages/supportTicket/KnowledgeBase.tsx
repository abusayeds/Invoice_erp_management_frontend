/**
 * File: src/pages/support/KnowledgeBase.tsx
 * Manage Knowledge Base:
 *   - List with Title (sortable), Category, Description (truncated), Created (sortable), Actions
 *   - Search + Filters button + 10-per-page selector
 *   - Upload icon + green + button in header
 *   - Edit modal: Title (required), Category dropdown (required), Description rich editor
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
  Filter,
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

interface KbArticle {
  id: string; // backend _id
  title: string;
  category: string; // category label (for display in the list)
  categoryId: string; // category _id (for edit pre-selection + writes)
  description: string;
  created: string;
}

interface KbCategory {
  id: string; // backend _id
  title: string;
}

type ModalMode = "add" | "edit" | null;

// Map a backend knowledge article (GET /support/knowledge/all) → row shape.
// The backend populates `category` as an object { _id, name } (or null).
const mapArticle = (d: any): KbArticle => {
  const cat = d.category;
  const isObj = cat && typeof cat === "object";
  return {
    id: String(d._id),
    title: d.title ?? "",
    category: isObj ? (cat.name ?? cat.title ?? "") : (cat ?? ""),
    categoryId: isObj ? String(cat._id ?? "") : "",
    description: d.description ?? "",
    created: d.createdAt
      ? new Date(d.createdAt).toISOString().slice(0, 16).replace("T", " ")
      : "",
  };
};


// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncate = (text: string, len = 110) =>
  text.length > len ? text.slice(0, len) + "..." : text;

const SortIcon = () => (
  <span className="inline-flex flex-col ml-1 text-gray-400">
    <ChevronUp className="w-3 h-3 -mb-0.5" />
    <ChevronDown className="w-3 h-3" />
  </span>
);

// ─── Rich Toolbar (decorative) ────────────────────────────────────────────────

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
      <button
        className={`${btn} !p-0 w-5 h-5 rounded bg-black flex items-center justify-center`}
      />
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
  article: KbArticle | null;
  categories: KbCategory[];
  onClose: () => void;
  onSave: (data: {
    title: string;
    categoryId: string;
    description: string;
  }) => void;
}

const KbModal: React.FC<ModalProps> = ({
  mode,
  article,
  categories,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(article?.title ?? "");
  // Pre-select the article's category by its id (falls back to a title match).
  const [category, setCategory] = useState(
    article
      ? article.categoryId ||
          (categories.find((c) => c.title === article.category)?.id ?? "")
      : "",
  );
  const [description, setDescription] = useState(article?.description ?? "");

  if (!mode) return null;

  const handleSubmit = () => {
    if (!title.trim() || !category || !description.trim()) return;
    onSave({
      title: title.trim(),
      categoryId: category,
      description: description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "edit" ? "Edit Knowledge Base" : "Add Knowledge Base"}
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
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-emerald-500 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
              placeholder="Enter title"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-white appearance-none"
              >
                <option value="">
                  {categories.length ? "Select a category" : "No categories — create one in System Setup"}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-emerald-500">
              <RichToolbar />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={9}
                className="w-full px-3 py-2.5 text-sm outline-none resize-none leading-relaxed"
                placeholder="Enter description..."
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

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

const DeleteModal: React.FC<{
  article: KbArticle | null;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ article, onClose, onConfirm }) => {
  if (!article) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Delete Article
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
          <span className="font-medium text-gray-900">"{article.title}"</span>?
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

export const KnowledgeBase: React.FC = () => {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingArticle, setEditingArticle] = useState<KbArticle | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<KbArticle | null>(
    null,
  );

  // Load real articles + categories from the backend.
  const loadArticles = useCallback(async () => {
    try {
      const res = await api.raw.get("/support/knowledge/all");
      setArticles(toArray<any>(res.data).map(mapArticle));
    } catch {
      setArticles([]);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.raw.get("/support/knowledge-categories/all");
      setCategories(
        toArray<any>(res.data).map((c: any) => ({
          id: String(c._id),
          title: c.title ?? "",
        })),
      );
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadArticles(), loadCategories()]).finally(() =>
      setLoading(false),
    );
  }, [loadArticles, loadCategories]);

  // Filter
  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditingArticle(null);
    setModalMode("add");
  };

  const openEdit = (article: KbArticle) => {
    setEditingArticle(article);
    setModalMode("edit");
  };

  const handleSave = async (data: {
    title: string;
    categoryId: string;
    description: string;
  }) => {
    // Backend: title, description, category=<category ObjectId>.
    const body = {
      title: data.title,
      description: data.description,
      category: data.categoryId,
    };
    try {
      if (modalMode === "add") {
        await api.raw.post("/support/knowledge/create", body);
      } else if (modalMode === "edit" && editingArticle) {
        await api.raw.patch(`/support/knowledge/${editingArticle.id}`, body);
      }
      await loadArticles();
      setPage(1);
    } catch {
      /* leave list unchanged on failure */
    }
  };

  const handleDelete = async () => {
    if (!deletingArticle) return;
    const target = deletingArticle;
    setDeletingArticle(null);
    setArticles((prev) => prev.filter((a) => a.id !== target.id));
    if (page > Math.ceil((filtered.length - 1) / perPage)) {
      setPage((p) => Math.max(1, p - 1));
    }
    try {
      await api.raw.delete(`/support/knowledge/${target.id}`);
    } catch {
      loadArticles();
    }
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer">Dashboard</span>
          <span className="text-gray-400">›</span>
          <span className="hover:text-gray-700 cursor-pointer">
            Support Tickets
          </span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">Knowledge Base</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
          <Globe className="w-4 h-4" />
          <span>en English</span>
        </div>
      </div>

      {/* Page title */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Manage Knowledge Base
        </h1>
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
                placeholder="Search knowledge base..."
                className="px-3 py-2 text-sm outline-none w-52"
              />
            </div>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium">
              Search
            </button>
          </div>

          {/* Right */}
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
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  <span className="flex items-center gap-1 cursor-pointer select-none">
                    Title <SortIcon />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
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
              {paged.map((article) => (
                <tr
                  key={article.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3.5 text-gray-900 text-sm font-medium w-56 max-w-[200px]">
                    {article.title}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                    {article.category}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm max-w-xl">
                    {truncate(article.description)}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm whitespace-nowrap">
                    {article.created}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(article)}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingArticle(article)}
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
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading
                        articles…
                      </span>
                    ) : search ? (
                      "No articles found matching your search."
                    ) : (
                      "No knowledge base articles yet."
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
      <KbModal
        mode={modalMode}
        article={editingArticle}
        categories={categories}
        onClose={() => {
          setModalMode(null);
          setEditingArticle(null);
        }}
        onSave={handleSave}
      />
      <DeleteModal
        article={deletingArticle}
        onClose={() => setDeletingArticle(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default KnowledgeBase;
