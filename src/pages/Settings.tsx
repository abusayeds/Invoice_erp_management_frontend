/**
 * File: src/pages/Settings.tsx
 * Settings page (route: /settings).
 *
 * Uses the app's split-panel layout: a left menu of settings sections and a
 * right panel that renders the selected section inline (no popups). The header
 * gear icon keeps its own quick-access dropdown (SettingsDropdown); this is the
 * full-page experience.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../utils/toast";
import {
  Search,
  RefreshCw,
  Plus,
  Edit2,
  ChevronRight,
  Download,
  Upload,
  X,
  Tag,
  FileText,
  Settings as SettingsIcon,
  Printer,
  Mail,
  Bell,
  ScanLine,
  Package,
  Globe,
  type LucideIcon,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type SettingsSection =
  | "categories"
  | "edit-titles"
  | "app-settings"
  | "pdf-print"
  | "email-templates"
  | "notifications"
  | "barcode"
  | "product-library"
  | "import"
  | "export"
  | "language";

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
}

interface Category {
  id: string;
  name: string;
}

// ─── Static config ────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "categories", label: "Categories", icon: Tag },
  { id: "edit-titles", label: "Edit Titles", icon: FileText },
  { id: "app-settings", label: "App Settings", icon: SettingsIcon },
  { id: "pdf-print", label: "PDF & Print Settings", icon: Printer },
  { id: "email-templates", label: "Email Templates", icon: Mail },
  { id: "notifications", label: "Notification Settings", icon: Bell },
  { id: "barcode", label: "Generate Barcode", icon: ScanLine },
  { id: "product-library", label: "Product Library", icon: Package },
  { id: "import", label: "Import Data", icon: Download },
  { id: "export", label: "Export Data", icon: Upload },
  { id: "language", label: "Language", icon: Globe },
];

const APP_SECTIONS = [
  "General",
  "Modules",
  "Currency & Format",
  "Printer",
  "Whatsapp",
  "Invoice",
  "Proforma Invoice",
  "Sales Receipt",
  "Estimate",
  "Delivery Challan",
  "Purchase Order",
  "Bill",
  "Credit Note",
  "Debit Note",
  "Expense",
  "Product",
];

// ─── Small shared pieces ──────────────────────────────────────────────────────

const Toggle: React.FC<{ defaultChecked?: boolean }> = ({ defaultChecked }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
  </label>
);

/** Header row for a section panel: title on the left, optional actions on the right. */
const PanelHeader: React.FC<{
  title: string;
  description?: string;
  children?: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>("categories");
  const [selectedAppSection, setSelectedAppSection] = useState("General");

  const [categories] = useState<Category[]>([
    { id: "1", name: "Maintenance" },
    { id: "2", name: "Advertising and Promotion" },
    { id: "3", name: "Utilities" },
    { id: "4", name: "Meals and Entertainment" },
    { id: "5", name: "Marketing" },
    { id: "6", name: "Depreciation" },
    { id: "7", name: "Insurance" },
    { id: "8", name: "Fees" },
    { id: "9", name: "Travel" },
  ]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // ── Section renderers ───────────────────────────────────────────────────────

  const renderCategories = () => (
    <div>
      <PanelHeader title="Categories" description="Organise products and expenses">
        <button
          onClick={() => showToast("Categories saved!", "success")}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Save
        </button>
      </PanelHeader>

      {editingCategory ? (
        <div className="max-w-md border border-gray-200 rounded-lg p-5 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Edit Category</h3>
            <button
              onClick={() => setEditingCategory(null)}
              className="p-1.5 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <input
                type="text"
                defaultValue={editingCategory.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Active</span>
              <Toggle defaultChecked />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Parent Category
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                <option>No Parent Category</option>
                <option>Stock Level</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setEditingCategory(null)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                showToast("Category updated!", "success");
                setEditingCategory(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-4 border-b border-gray-200">
            <button className="pb-2 text-sm font-medium text-gray-900 border-b-2 border-blue-600">
              All Category
            </button>
            <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Products
            </button>
            <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Expenses
            </button>
          </div>

          <div className="space-y-2 max-w-2xl">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <span className="text-sm text-gray-900">{category.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => showToast("Add new category", "info")}
            className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 mt-6"
            title="Add category"
          >
            <Plus className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );

  const renderEditTitles = () => (
    <div>
      <PanelHeader title="Edit Titles" description="Promotional headlines shown on documents">
        <button
          onClick={() => showToast("Searching...", "info")}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <Search className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => showToast("Refreshing...", "info")}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => showToast("Titles saved!", "success")}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
        >
          Save
        </button>
      </PanelHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          "50% OFF First Month Plan",
          "20% OFF Annual Subscription",
          "Free Trial for 14 Days",
          "Refer a Friend and Get $10",
          "Buy One Get One Free",
          "30% OFF on Select Items",
          "Exclusive Member Discounts",
          "Limited Time: 10% OFF All Orders",
        ].map((title, index) => (
          <div
            key={index}
            className="p-3 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50"
          >
            {title}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAppSettings = () => (
    <div>
      <PanelHeader title="App Settings" description="Configure module and display preferences">
        <button
          onClick={() => showToast("Searching...", "info")}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <Search className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => showToast("Settings saved!", "success")}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
        >
          Save
        </button>
      </PanelHeader>

      <div className="flex flex-col lg:flex-row border border-gray-200 rounded-lg overflow-hidden">
        {/* Sub-section list */}
        <div className="w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 overflow-y-auto max-h-72 lg:max-h-[28rem]">
          {APP_SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => setSelectedAppSection(section)}
              className={`w-full px-4 py-3 text-left text-sm ${
                selectedAppSection === section
                  ? "bg-white text-blue-600 font-medium border-l-2 border-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Sub-section content */}
        <div className="flex-1 p-4 sm:p-6">
          {selectedAppSection === "General" && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-base font-semibold text-gray-900">Chat</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Create Public URL in Email</span>
                <Toggle defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Appearance</span>
                <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>Light</option>
                  <option>Dark</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Default Mail</span>
                <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>Moon Main server</option>
                </select>
              </div>
            </div>
          )}

          {selectedAppSection === "Modules" && (
            <div className="space-y-4 max-w-xl">
              {[
                "Invoice",
                "Estimate",
                "Sales Receipt",
                "Purchase Order",
                "Bill",
                "Credit Note",
                "Debit Note",
                "Expense",
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item}</span>
                  <Toggle defaultChecked />
                </div>
              ))}
            </div>
          )}

          {selectedAppSection === "Currency & Format" && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Currency
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Currency Symbol</span>
                <Toggle defaultChecked />
              </div>
            </div>
          )}

          {!["General", "Modules", "Currency & Format"].includes(selectedAppSection) && (
            <div className="text-sm text-gray-500 py-12 text-center">
              No settings available for "{selectedAppSection}" yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPdfPrint = () => (
    <div>
      <PanelHeader title="PDF & Print Settings" description="Style how documents are printed and exported">
        <button
          onClick={() => showToast("Settings saved!", "success")}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
        >
          Save
        </button>
      </PanelHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Preview */}
        <div className="w-full lg:w-1/3">
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded shadow-sm">
              <div className="p-4 text-xs text-gray-600">Invoice Preview</div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="flex-1 space-y-6">
          <h3 className="text-sm font-semibold text-gray-900">Style</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["Text Color", "Border Color", "Fill Color", "Fill Text Color"].map((label) => (
              <button
                key={label}
                onClick={() => showToast(`${label} selected`, "info")}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-left text-sm"
              >
                <span className="w-4 h-4 rounded bg-gray-800 inline-block" />
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Font</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Times New Roman</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Font Size</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option>Medium</option>
                <option>Small</option>
                <option>Large</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Paper</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option>US Paper</option>
                <option>A4</option>
                <option>Legal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Full Page</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmailTemplates = () => (
    <div>
      <PanelHeader title="Email Templates" description="Customise outgoing email content">
        <button
          onClick={() => showToast("Template saved!", "success")}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Save
        </button>
      </PanelHeader>

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Template Type
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>Invoice Email</option>
            <option>Estimate Email</option>
            <option>Payment Receipt</option>
            <option>Reminder Email</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
          <input
            type="text"
            placeholder="Email subject..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Body</label>
          <textarea
            rows={10}
            placeholder="Email content..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y"
          />
        </div>

        <div className="text-sm text-gray-600">
          <strong>Available variables:</strong> {"{customer_name}"}, {"{invoice_number}"},{" "}
          {"{amount}"}, {"{due_date}"}
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div>
      <PanelHeader title="Notification Settings" description="Reminders and recurring alerts">
        <button
          onClick={() => showToast("Refreshing...", "info")}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => showToast("Settings saved!", "success")}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
        >
          Save
        </button>
      </PanelHeader>

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Default Time Zone
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>GMT +7:00 America/Los Angeles</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notification Time
          </label>
          <input
            type="time"
            defaultValue="07:00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recurring</h3>
          <div className="space-y-3">
            {["Auto Send Invoice", "Daily", "Weekly", "Monthly"].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item}</span>
                <Toggle defaultChecked />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Reminder</h3>
          <div className="space-y-3">
            {[
              "Auto Send Payment Receipt",
              "Default for new Customer",
              "3 days before due date",
              "On due date",
              "3 days after due date",
              "7 days after due date",
            ].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item}</span>
                <Toggle defaultChecked />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBarcode = () => (
    <div>
      <PanelHeader title="Generate Barcode" description="Create printable barcode labels">
        <button
          onClick={() => showToast("Downloading barcodes...", "info")}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <Download className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => showToast("Refreshing...", "info")}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => showToast("Generating barcodes...", "info")}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Generate (0)
        </button>
      </PanelHeader>

      <div className="border border-gray-200 rounded-lg overflow-x-auto mb-6">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Item Name", "SKU", "No of Labels", "Header", "Line 1", "Line 2", "Action"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                Product Not Available.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Add Barcode</h3>
          <button
            onClick={() => showToast("Adding barcode...", "info")}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Add
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Item Name*"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="SKU*"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400"
          />
          <input
            type="number"
            placeholder="No of Labels*"
            defaultValue="1"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Header"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Line 1"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Line 2"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400"
          />
        </div>
      </div>
    </div>
  );

  const renderProductLibrary = () => (
    <div>
      <PanelHeader title="Product Library" description="Import products from the shared catalogue">
        <button
          onClick={() => showToast("Importing selected products...", "info")}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Import (0)
        </button>
      </PanelHeader>

      <div className="flex flex-col lg:flex-row border border-gray-200 rounded-lg overflow-hidden">
        {/* Categories */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 p-4 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">Sort by: Created on</div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Product Library</h3>
          <div className="text-xs text-gray-500 mb-4">All files and folders</div>

          <div className="text-sm font-medium text-gray-700 mb-2">Categories</div>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3">
            <option>Sort by Name</option>
            <option>Sort by Date</option>
            <option>Sort by Count</option>
          </select>

          <div className="space-y-1">
            {[
              { name: "Appliances", count: 72 },
              { name: "Bags & Backpacks", count: 1381 },
              { name: "Beauty & Personal Care", count: 233 },
              { name: "Bottom Wear", count: 176 },
              { name: "Boys Clothing", count: 3508 },
              { name: "Caps & Shorts For Men", count: 301 },
              { name: "Deodorants For Men & Women", count: 280 },
              { name: "Diwali", count: 69 },
              { name: "Ethnic Wear", count: 37 },
            ].map((cat) => (
              <button
                key={cat.name}
                onClick={() => showToast(`Viewing ${cat.name} category`, "info")}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded text-left"
              >
                <span className="text-sm text-gray-700">{cat.name}</span>
                <span className="text-xs text-gray-500">{cat.count}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => showToast("Showing all 63 categories", "info")}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            63 Categories
          </button>
        </div>

        {/* Products */}
        <div className="flex-1 p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Appliances</h3>
            <div className="text-sm text-gray-500">72 Products</div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Products", "Quantity", "Price"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-900"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "wonderchef Ultima Plus Auto Glass Gas Cooktop",
                    qty: 1,
                    price: "BDT 2332",
                  },
                  {
                    name: "Prestige Marvel Glass Top 3 Burner Gas Stove",
                    qty: 1,
                    price: "BDT 2750",
                  },
                  {
                    name: "Philips Viva Collection Air Fryer XXL",
                    qty: 1,
                    price: "BDT 8900",
                  },
                ].map((product, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => showToast(`Selected: ${product.name}`, "info")}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.qty}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500">0 of 1 GB</div>
        </div>
      </div>
    </div>
  );

  const renderImport = () => (
    <div>
      <PanelHeader title="Import Data" description="Bring records in from a file" />

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Select Data Type
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>Customers</option>
            <option>Products</option>
            <option>Invoices</option>
            <option>Expenses</option>
          </select>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop your file here, or click to browse
          </p>
          <button
            onClick={() => showToast("Opening file browser...", "info")}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Choose File
          </button>
          <p className="text-xs text-gray-500 mt-2">Supported formats: CSV, XLSX</p>
        </div>

        <button
          onClick={() => showToast("Importing data...", "info")}
          className="w-full px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
        >
          Import
        </button>
      </div>
    </div>
  );

  const renderExport = () => (
    <div>
      <PanelHeader title="Export Data" description="Download your records" />

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Select Data Type
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>All Data</option>
            <option>Customers</option>
            <option>Products</option>
            <option>Invoices</option>
            <option>Expenses</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Export Format
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>CSV</option>
            <option>Excel (XLSX)</option>
            <option>PDF</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
        </div>

        <button
          onClick={() => showToast("Exporting data...", "info")}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export Data
        </button>
      </div>
    </div>
  );

  const renderLanguage = () => (
    <div>
      <PanelHeader title="Language" description="Choose your preferred language" />

      <div className="space-y-2 max-w-md">
        {[
          { code: "en", name: "English", native: "English" },
          { code: "ar", name: "Arabic", native: "العربية" },
          { code: "es", name: "Spanish", native: "Español" },
          { code: "fr", name: "French", native: "Français" },
          { code: "de", name: "German", native: "Deutsch" },
          { code: "hi", name: "Hindi", native: "हिन्दी" },
          { code: "bn", name: "Bengali", native: "বাংলা" },
        ].map((lang) => (
          <button
            key={lang.code}
            onClick={() => showToast(`Language changed to ${lang.name}`, "info")}
            className="w-full px-4 py-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-blue-600 transition-colors"
          >
            <div className="font-medium text-gray-900">{lang.name}</div>
            <div className="text-sm text-gray-500">{lang.native}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "categories":
        return renderCategories();
      case "edit-titles":
        return renderEditTitles();
      case "app-settings":
        return renderAppSettings();
      case "pdf-print":
        return renderPdfPrint();
      case "email-templates":
        return renderEmailTemplates();
      case "notifications":
        return renderNotifications();
      case "barcode":
        return renderBarcode();
      case "product-library":
        return renderProductLibrary();
      case "import":
        return renderImport();
      case "export":
        return renderExport();
      case "language":
        return renderLanguage();
      default:
        return null;
    }
  };

  // ── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">
            Dashboard
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Settings</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
      </div>

      {/* Split panel */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left menu */}
        <nav className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white overflow-y-auto shrink-0">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveSection(id);
                  setEditingCategory(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-l-2 transition-colors ${
                  active
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                    : "border-transparent text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-gray-400"}`} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{renderSection()}</div>
      </div>
    </div>
  );
};

export default SettingsPage;
