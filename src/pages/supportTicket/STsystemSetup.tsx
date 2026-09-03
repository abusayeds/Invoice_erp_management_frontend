/**
 * File: src/pages/support/SystemSetup.tsx
 * System Setup – left sidebar navigation + right content panel
 *
 * Sidebar items (9):
 *   1. Categories           – table: Category | Color pill | Action (edit/delete) + Add modal
 *   2. KnowledgeBase Category – table: Category | Action (edit/delete) + Add modal
 *   3. Brand Settings       – Logo upload, Favicon upload, Title Text, Footer Text
 *   4. Custom Pages         – table: Title | Slug (code tag + link icon) | Status (Enabled) | Action (edit only)
 *   5. Title Sections       – 2-col grid: Create Ticket, Search Ticket, Knowledge Base, FAQ, Contact (title+desc)
 *   6. CTA Sections         – 2-col: Knowledge Base CTA, FAQ CTA (title+desc)
 *   7. Quick Links          – (placeholder, not in screenshots – minimal)
 *   8. Support Information  – Response Time textarea, Opening/Closing Hours, Business Hours toggles (Mon-Sun), Phone Support
 *   9. Contact Information  – Map Settings (Google Maps embed URL) + Contact Details (Address, Phone, Email)
 */

import React, { useState } from "react";
import {
  Globe,
  Folder,
  BarChart2,
  Palette,
  FileText,
  Type,
  Zap,
  Link2,
  Info,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ExternalLink,
  Image,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarItem =
  | "categories"
  | "kb-category"
  | "brand"
  | "custom-pages"
  | "title-sections"
  | "cta-sections"
  | "quick-links"
  | "support-info"
  | "contact-info";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface KbCategory {
  id: number;
  name: string;
}

interface CustomPage {
  id: number;
  title: string;
  slug: string;
  status: "Enabled" | "Disabled";
}

// ─── Shared: AppHeader ────────────────────────────────────────────────────────

const AppHeader: React.FC<{ section: string }> = ({ section }) => (
  <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="hover:text-gray-700 cursor-pointer">Dashboard</span>
      <span className="text-gray-400">›</span>
      <span className="hover:text-gray-700 cursor-pointer">
        Support Tickets
      </span>
      <span className="text-gray-400">›</span>
      <span className="hover:text-gray-700 cursor-pointer">System Setup</span>
      <span className="text-gray-400">›</span>
      <span className="text-gray-900 font-medium">{section}</span>
    </div>
    <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1">
      <Globe className="w-4 h-4" />
      <span>en English</span>
    </div>
  </div>
);

// ─── Shared: Toggle ───────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? "bg-emerald-500" : "bg-gray-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

// ─── Shared: SaveChangesBtn ───────────────────────────────────────────────────

const SaveChangesBtn: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors font-medium"
  >
    <Save className="w-4 h-4" /> Save Changes
  </button>
);

// ─── Shared: Delete Confirmation Modal ───────────────────────────────────────

const DeleteModal: React.FC<{
  label: string;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ label, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Delete</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-5">
        Are you sure you want to delete{" "}
        <span className="font-medium text-gray-900">"{label}"</span>? This
        cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
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

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Categories
// ═══════════════════════════════════════════════════════════════════════════════

const initialCategories: Category[] = [
  { id: 1, name: "Billing", color: "#10b77f" },
  { id: 2, name: "Technical Support", color: "#3B82F6" },
  { id: 3, name: "Billing & Payment", color: "#10b77f" },
  { id: 4, name: "Feature Request", color: "#F59E0B" },
  { id: 5, name: "Bug Report", color: "#EF4444" },
  { id: 6, name: "Account Management", color: "#06B6D4" },
  { id: 7, name: "Integration Support", color: "#84CC16" },
  { id: 8, name: "Performance Issues", color: "#F97316" },
  { id: 9, name: "Security Concerns", color: "#DC2626" },
  { id: 10, name: "Training & Education", color: "#7C3AED" },
  { id: 11, name: "General Inquiry", color: "#6B7280" },
];

const CategoriesPanel: React.FC = () => {
  const [items, setItems] = useState<Category[]>(initialCategories);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b77f");

  const openAdd = () => {
    setName("");
    setColor("#10b77f");
    setEditing(null);
    setModal("add");
  };
  const openEdit = (c: Category) => {
    setName(c.name);
    setColor(c.color);
    setEditing(c);
    setModal("edit");
  };
  const handleSave = () => {
    if (!name.trim()) return;
    if (modal === "add") {
      setItems((p) => [...p, { id: Date.now(), name: name.trim(), color }]);
    } else if (editing) {
      setItems((p) =>
        p.map((c) =>
          c.id === editing.id ? { ...c, name: name.trim(), color } : c,
        ),
      );
    }
    setModal(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
        <button
          onClick={openAdd}
          className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Color
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 text-gray-900">{cat.name}</td>
                <td className="px-4 py-3.5">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-white text-xs font-medium"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.color.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(cat)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(cat)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {modal === "add" ? "Add Category" : "Edit Category"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-emerald-500 rounded-md px-3 py-2 text-sm outline-none"
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Color <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium"
              >
                {modal === "add" ? "Save" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <DeleteModal
          label={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            setItems((p) => p.filter((c) => c.id !== deleting.id));
            setDeleting(null);
          }}
        />
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. KnowledgeBase Category
// ═══════════════════════════════════════════════════════════════════════════════

const initialKbCats: KbCategory[] = [
  { id: 1, name: "Getting Started Guide" },
  { id: 2, name: "Billing & Subscription Management" },
  { id: 3, name: "Feature Documentation" },
  { id: 4, name: "Troubleshooting & Bug Fixes" },
  { id: 5, name: "Account Setup & Configuration" },
  { id: 6, name: "Third-Party Integrations" },
  { id: 7, name: "Performance Optimization" },
  { id: 8, name: "Security Best Practices" },
  { id: 9, name: "User Training Resources" },
  { id: 10, name: "FAQ & Common Questions" },
];

const KbCategoryPanel: React.FC = () => {
  const [items, setItems] = useState<KbCategory[]>(initialKbCats);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<KbCategory | null>(null);
  const [deleting, setDeleting] = useState<KbCategory | null>(null);
  const [name, setName] = useState("");

  const openAdd = () => {
    setName("");
    setEditing(null);
    setModal("add");
  };
  const openEdit = (c: KbCategory) => {
    setName(c.name);
    setEditing(c);
    setModal("edit");
  };
  const handleSave = () => {
    if (!name.trim()) return;
    if (modal === "add") {
      setItems((p) => [...p, { id: Date.now(), name: name.trim() }]);
    } else if (editing) {
      setItems((p) =>
        p.map((c) => (c.id === editing.id ? { ...c, name: name.trim() } : c)),
      );
    }
    setModal(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Knowledge Categories
        </h2>
        <button
          onClick={openAdd}
          className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 text-gray-900">{cat.name}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(cat)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(cat)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {modal === "add" ? "Add KB Category" : "Edit KB Category"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-emerald-500 rounded-md px-3 py-2 text-sm outline-none"
                placeholder="Enter category name"
              />
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium"
              >
                {modal === "add" ? "Save" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <DeleteModal
          label={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            setItems((p) => p.filter((c) => c.id !== deleting.id));
            setDeleting(null);
          }}
        />
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Brand Settings
// ═══════════════════════════════════════════════════════════════════════════════

const BrandSettingsPanel: React.FC = () => {
  const [logoName, setLogoName] = useState("logo.png");
  const [faviconName, setFaviconName] = useState("favicon.png");
  const [titleText, setTitleText] = useState("");
  const [footerText, setFooterText] = useState("");

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Brand Settings</h2>
        <SaveChangesBtn />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo
          </label>
          <div className="border border-gray-200 rounded-lg h-36 flex items-center justify-center bg-white mb-2">
            <div className="flex items-center gap-1">
              <span className="text-3xl font-bold text-emerald-500">ST</span>
              <span className="text-2xl font-light text-gray-600 ml-1">
                Ticket
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={logoName}
              readOnly
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600 bg-white"
            />
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
              <Image className="w-4 h-4" /> Browse
            </button>
            <button
              onClick={() => setLogoName("")}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Favicon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Favicon
          </label>
          <div className="border border-gray-200 rounded-lg h-36 flex items-center justify-center bg-white mb-2">
            <span className="text-3xl font-bold text-emerald-500">ST</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={faviconName}
              readOnly
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600 bg-white"
            />
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
              <Image className="w-4 h-4" /> Browse
            </button>
            <button
              onClick={() => setFaviconName("")}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Title Text + Footer Text */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Title Text <span className="text-red-500">*</span>
          </label>
          <input
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            placeholder="Enter title text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Footer Text <span className="text-red-500">*</span>
          </label>
          <input
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Enter footer text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Custom Pages
// ═══════════════════════════════════════════════════════════════════════════════

const initialCustomPages: CustomPage[] = [
  { id: 1, title: "Privacy Policy", slug: "privacy-policy", status: "Enabled" },
  {
    id: 2,
    title: "Terms & Conditions",
    slug: "terms-conditions",
    status: "Enabled",
  },
];

const CustomPagesPanel: React.FC = () => {
  const [pages] = useState<CustomPage[]>(initialCustomPages);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CustomPage | null>(null);

  const openEdit = (p: CustomPage) => {
    setEditing(p);
    setModal(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Custom Pages</h2>
        <button className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 text-gray-900 font-medium">
                  {page.title}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                      {page.slug}
                    </code>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    {page.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => openEdit(page)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                Edit Custom Page
              </h3>
              <button
                onClick={() => setModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  defaultValue={editing.title}
                  className="w-full border border-emerald-500 rounded-md px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  defaultValue={editing.status}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none bg-white"
                >
                  <option>Enabled</option>
                  <option>Disabled</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md font-medium"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Title Sections
// ═══════════════════════════════════════════════════════════════════════════════

const TitleSectionsPanel: React.FC = () => {
  const sections = [
    {
      key: "create",
      label: "Create Ticket Section",
      titlePh: "Enter create ticket title",
      descPh: "Enter create ticket description",
    },
    {
      key: "search",
      label: "Search Ticket Section",
      titlePh: "Enter search ticket title",
      descPh: "Enter search ticket description",
    },
    {
      key: "kb",
      label: "Knowledge Base Section",
      titlePh: "Enter knowledge base title",
      descPh: "Enter knowledge base description",
    },
    {
      key: "faq",
      label: "FAQ Section",
      titlePh: "Enter FAQ title",
      descPh: "Enter FAQ description",
    },
    {
      key: "contact",
      label: "Contact Section",
      titlePh: "Enter contact title",
      descPh: "Enter contact description",
    },
  ];
  const [values, setValues] = useState<
    Record<string, { title: string; desc: string }>
  >(() =>
    Object.fromEntries(sections.map((s) => [s.key, { title: "", desc: "" }])),
  );

  const update = (key: string, field: "title" | "desc", val: string) =>
    setValues((p) => ({ ...p, [key]: { ...p[key], [field]: val } }));

  // Build pairs for 2-col layout
  const pairs: ((typeof sections)[0] | null)[][] = [];
  for (let i = 0; i < sections.length; i += 2) {
    pairs.push([sections[i], sections[i + 1] ?? null]);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Title Sections</h2>
        <SaveChangesBtn />
      </div>
      <div className="space-y-5">
        {pairs.map((pair, pi) => (
          <div
            key={pi}
            className={`grid gap-5 ${pair[1] ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {pair.map((sec) =>
              sec ? (
                <div
                  key={sec.key}
                  className="border border-gray-200 rounded-lg p-5"
                >
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    {sec.label}
                  </h3>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={values[sec.key].title}
                      onChange={(e) => update(sec.key, "title", e.target.value)}
                      placeholder={sec.titlePh}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={values[sec.key].desc}
                      onChange={(e) => update(sec.key, "desc", e.target.value)}
                      placeholder={sec.descPh}
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-y"
                    />
                  </div>
                </div>
              ) : null,
            )}
          </div>
        ))}
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CTA Sections
// ═══════════════════════════════════════════════════════════════════════════════

const CtaSectionsPanel: React.FC = () => {
  const [kbTitle, setKbTitle] = useState("");
  const [kbDesc, setKbDesc] = useState("");
  const [faqTitle, setFaqTitle] = useState("");
  const [faqDesc, setFaqDesc] = useState("");

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">CTA Sections</h2>
        <SaveChangesBtn />
      </div>
      <div className="grid grid-cols-2 gap-5">
        {/* KB CTA */}
        <div className="border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Knowledge Base CTA
          </h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={kbTitle}
              onChange={(e) => setKbTitle(e.target.value)}
              placeholder="Enter knowledge base CTA title"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={kbDesc}
              onChange={(e) => setKbDesc(e.target.value)}
              placeholder="Enter knowledge base CTA description"
              rows={5}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-y"
            />
          </div>
        </div>
        {/* FAQ CTA */}
        <div className="border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">FAQ CTA</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={faqTitle}
              onChange={(e) => setFaqTitle(e.target.value)}
              placeholder="Enter FAQ CTA title"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={faqDesc}
              onChange={(e) => setFaqDesc(e.target.value)}
              placeholder="Enter FAQ CTA description"
              rows={5}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-y"
            />
          </div>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Quick Links (placeholder — not in provided screenshots)
// ═══════════════════════════════════════════════════════════════════════════════

const QuickLinksPanel: React.FC = () => {
  const [links, setLinks] = useState<
    { id: number; label: string; url: string }[]
  >([
    { id: 1, label: "Support Portal", url: "https://support.example.com" },
    { id: 2, label: "Documentation", url: "https://docs.example.com" },
  ]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setLinks((p) => [...p, { id: Date.now(), label: "", url: "" }])
            }
            className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
          <SaveChangesBtn />
        </div>
      </div>
      <div className="space-y-3">
        {links.map((link) => (
          <div
            key={link.id}
            className="border border-gray-200 rounded-lg p-4 flex items-center gap-3"
          >
            <input
              defaultValue={link.label}
              placeholder="Link label"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <input
              defaultValue={link.url}
              placeholder="URL"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => setLinks((p) => p.filter((l) => l.id !== link.id))}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {links.length === 0 && (
          <div className="text-center py-10 text-sm text-gray-400">
            No quick links yet. Click + to add one.
          </div>
        )}
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Support Information
// ═══════════════════════════════════════════════════════════════════════════════

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SupportInfoPanel: React.FC = () => {
  const [responseTime, setResponseTime] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [closingHours, setClosingHours] = useState("");
  const [businessDays, setBusinessDays] = useState<Record<string, boolean>>({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false,
  });
  const [phone, setPhone] = useState("");

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Support Information
        </h2>
        <SaveChangesBtn />
      </div>

      <div className="space-y-5">
        {/* Response Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Response Time <span className="text-red-500">*</span>
          </label>
          <textarea
            value={responseTime}
            onChange={(e) => setResponseTime(e.target.value)}
            placeholder="Enter response time information"
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-y"
          />
        </div>

        {/* Opening / Closing Hours */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Opening Hours <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Closing Hours <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={closingHours}
              onChange={(e) => setClosingHours(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Business Hours */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Business Hours
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-800">{day}</span>
                <Toggle
                  checked={businessDays[day]}
                  onChange={(v) => setBusinessDays((p) => ({ ...p, [day]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Phone Support */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Support <span className="text-red-500">*</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Format: +[country code][phone number]
          </p>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Contact Information
// ═══════════════════════════════════════════════════════════════════════════════

const ContactInfoPanel: React.FC = () => {
  const [mapEmbed, setMapEmbed] = useState(
    `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d9581841.830083132!2d-14.999203219951713!3d54.103586639352952m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x25a3b1142c791a9%3A0xc4f8a0433288257a!2sUnited%20Kingdom!5e0!3m2!1sen!2sin!4v1762249682876!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
  );
  const [address, setAddress] = useState(
    "350 Fifth Avenue, New York, NY 10118",
  );
  const [phone, setPhone] = useState("+1 (212) 736-3100");
  const [email, setEmail] = useState("info@dashsupport.com");

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Contact Information
        </h2>
        <SaveChangesBtn />
      </div>

      {/* Map Settings */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Map Settings
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Google Maps Embed URL <span className="text-red-500">*</span>
          </label>
          <textarea
            value={mapEmbed}
            onChange={(e) => setMapEmbed(e.target.value)}
            rows={5}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-y font-mono text-xs"
          />
        </div>
      </div>

      {/* Contact Details */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Contact Details
        </h3>
        <div className="grid grid-cols-2 gap-5">
          {/* Address — spans left */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Phone + Email stacked on right */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Format: +[country code][phone number]
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Sidebar nav config
// ═══════════════════════════════════════════════════════════════════════════════

const navItems: {
  id: SidebarItem;
  label: string;
  icon: React.ReactNode;
  section: string;
}[] = [
  {
    id: "categories",
    label: "Categories",
    icon: <Folder className="w-4 h-4" />,
    section: "Categories",
  },
  {
    id: "kb-category",
    label: "KnowledgeBase Category",
    icon: <BarChart2 className="w-4 h-4" />,
    section: "Knowledge Categories",
  },
  {
    id: "brand",
    label: "Brand Settings",
    icon: <Palette className="w-4 h-4" />,
    section: "Brand Settings",
  },
  {
    id: "custom-pages",
    label: "Custom Pages",
    icon: <FileText className="w-4 h-4" />,
    section: "Custom Pages",
  },
  {
    id: "title-sections",
    label: "Title Sections",
    icon: <Type className="w-4 h-4" />,
    section: "Title Sections",
  },
  {
    id: "cta-sections",
    label: "CTA Sections",
    icon: <Zap className="w-4 h-4" />,
    section: "CTA Sections",
  },
  {
    id: "quick-links",
    label: "Quick Links",
    icon: <Link2 className="w-4 h-4" />,
    section: "Quick Links",
  },
  {
    id: "support-info",
    label: "Support Information",
    icon: <Info className="w-4 h-4" />,
    section: "Support Information",
  },
  {
    id: "contact-info",
    label: "Contact Information",
    icon: <MapPin className="w-4 h-4" />,
    section: "Contact Information",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Root Component
// ═══════════════════════════════════════════════════════════════════════════════

export const STsystemSetup: React.FC = () => {
  const [active, setActive] = useState<SidebarItem>("categories");
  const current = navItems.find((n) => n.id === active)!;

  const renderPanel = () => {
    switch (active) {
      case "categories":
        return <CategoriesPanel />;
      case "kb-category":
        return <KbCategoryPanel />;
      case "brand":
        return <BrandSettingsPanel />;
      case "custom-pages":
        return <CustomPagesPanel />;
      case "title-sections":
        return <TitleSectionsPanel />;
      case "cta-sections":
        return <CtaSectionsPanel />;
      case "quick-links":
        return <QuickLinksPanel />;
      case "support-info":
        return <SupportInfoPanel />;
      case "contact-info":
        return <ContactInfoPanel />;
    }
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] flex flex-col overflow-hidden">
      <AppHeader section={current.section} />

      {/* Page title */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <h1 className="text-xl font-semibold text-gray-900">System Setup</h1>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex-1 overflow-hidden flex">
        {/* ── Sidebar ── */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto py-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                active === item.id
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span
                className={
                  active === item.id ? "text-gray-600" : "text-gray-400"
                }
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Content Panel ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 min-h-full">
            {renderPanel()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default STsystemSetup;
