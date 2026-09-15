/**
 * Shared settings section bodies — used by /settings page and header dropdown modals.
 * Change content here once; both surfaces pick it up.
 */
import React, { useState } from "react";
import { showToast } from "@/utils/toast";
import {
  Search,
  RefreshCw,
  Plus,
  Edit2,
  ChevronRight,
  Download,
  Upload,
  X,
} from "lucide-react";
import {
  DEFAULT_SETTINGS_CATEGORIES,
  SETTINGS_APP_SECTIONS,
  SETTINGS_PROMO_TITLES,
  type SettingsSectionId,
} from "./settingsConfig";

type Category = { id: string; name: string };

const Toggle: React.FC<{ defaultChecked?: boolean }> = ({ defaultChecked }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
  </label>
);

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

export type SettingsSectionViewProps = {
  section: SettingsSectionId;
  /** When true, App Settings opens via AppSettingsModal at the host (page/dropdown). */
  onOpenAppSettingsModal?: () => void;
};

export const SettingsSectionView: React.FC<SettingsSectionViewProps> = ({
  section,
  onOpenAppSettingsModal,
}) => {
  const [categories] = useState<Category[]>(DEFAULT_SETTINGS_CATEGORIES);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedAppSection, setSelectedAppSection] = useState("General");

  if (section === "categories") {
    return (
      <div>
        <PanelHeader title="Categories" description="Organise products and expenses">
          <button
            type="button"
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
              <button type="button" onClick={() => setEditingCategory(null)} className="p-1.5 hover:bg-gray-200 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Parent Category</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option>No Parent Category</option>
                  <option>Stock Level</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
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
              <button type="button" className="pb-2 text-sm font-medium text-gray-900 border-b-2 border-blue-600">
                All Category
              </button>
              <button type="button" className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                Products
              </button>
              <button type="button" className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
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
                      type="button"
                      onClick={() => setEditingCategory(category)}
                      className="p-1.5 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button type="button" className="p-1.5 hover:bg-gray-100 rounded">
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
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
  }

  if (section === "edit-titles") {
    return (
      <div>
        <PanelHeader title="Edit Titles" description="Promotional headlines shown on documents">
          <button type="button" onClick={() => showToast("Searching...", "info")} className="p-2 hover:bg-gray-100 rounded">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button type="button" onClick={() => showToast("Refreshing...", "info")} className="p-2 hover:bg-gray-100 rounded">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => showToast("Titles saved!", "success")}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
          >
            Save
          </button>
        </PanelHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {SETTINGS_PROMO_TITLES.map((title) => (
            <div key={title} className="p-3 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50">
              {title}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === "app-settings") {
    // Prefer the real App Settings modal when host provides it (dropdown already did).
    if (onOpenAppSettingsModal) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-600 mb-4">Configure modules, currency, printer and document options.</p>
          <button
            type="button"
            onClick={onOpenAppSettingsModal}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Open App Settings
          </button>
        </div>
      );
    }
    return (
      <div>
        <PanelHeader title="App Settings" description="Configure module and display preferences">
          <button type="button" onClick={() => showToast("Searching...", "info")} className="p-2 hover:bg-gray-100 rounded">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => showToast("Settings saved!", "success")}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
          >
            Save
          </button>
        </PanelHeader>
        <div className="flex flex-col lg:flex-row border border-gray-200 rounded-lg overflow-hidden">
          <div className="w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 overflow-y-auto max-h-72 lg:max-h-[28rem]">
            {SETTINGS_APP_SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedAppSection(s)}
                className={`w-full px-4 py-3 text-left text-sm ${
                  selectedAppSection === s
                    ? "bg-white text-blue-600 font-medium border-l-2 border-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
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
                {["Invoice", "Estimate", "Sales Receipt", "Purchase Order", "Bill", "Credit Note", "Debit Note", "Expense"].map(
                  (item) => (
                    <div key={item} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{item}</span>
                      <Toggle defaultChecked />
                    </div>
                  ),
                )}
              </div>
            )}
            {selectedAppSection === "Currency & Format" && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
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
                No settings available for &quot;{selectedAppSection}&quot; yet.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (section === "pdf-print") {
    return (
      <div>
        <PanelHeader title="PDF & Print Settings" description="Style how documents are printed and exported">
          <button
            type="button"
            onClick={() => showToast("Settings saved!", "success")}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
          >
            Save
          </button>
        </PanelHeader>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded shadow-sm">
                <div className="p-4 text-xs text-gray-600">Invoice Preview</div>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <h3 className="text-sm font-semibold text-gray-900">Style</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["Text Color", "Border Color", "Fill Color", "Fill Text Color"].map((label) => (
                <button
                  key={label}
                  type="button"
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
  }

  if (section === "email-templates") {
    return (
      <div>
        <PanelHeader title="Email Templates" description="Customise outgoing email content">
          <button
            type="button"
            onClick={() => showToast("Template saved!", "success")}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </PanelHeader>
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Type</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>Invoice Email</option>
              <option>Estimate Email</option>
              <option>Payment Receipt</option>
              <option>Reminder Email</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <input type="text" placeholder="Email subject..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Body</label>
            <textarea rows={10} placeholder="Email content..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y" />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Available variables:</strong> {"{customer_name}"}, {"{invoice_number}"}, {"{amount}"}, {"{due_date}"}
          </div>
        </div>
      </div>
    );
  }

  if (section === "notifications") {
    return (
      <div>
        <PanelHeader title="Notification Settings" description="Reminders and recurring alerts">
          <button type="button" onClick={() => showToast("Refreshing...", "info")} className="p-2 hover:bg-gray-100 rounded">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => showToast("Settings saved!", "success")}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
          >
            Save
          </button>
        </PanelHeader>
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Time Zone</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>GMT +7:00 America/Los Angeles</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notification Time</label>
            <input type="time" defaultValue="07:00" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
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
  }

  if (section === "barcode") {
    return (
      <div>
        <PanelHeader title="Generate Barcode" description="Create printable barcode labels">
          <button type="button" onClick={() => showToast("Downloading barcodes...", "info")} className="p-2 hover:bg-gray-100 rounded">
            <Download className="w-5 h-5 text-gray-600" />
          </button>
          <button type="button" onClick={() => showToast("Refreshing...", "info")} className="p-2 hover:bg-gray-100 rounded">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <button
            type="button"
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
                {["Item Name", "SKU", "No of Labels", "Header", "Line 1", "Line 2", "Action"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {h}
                  </th>
                ))}
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
            <button type="button" onClick={() => showToast("Adding barcode...", "info")} className="text-sm text-blue-600 hover:text-blue-700">
              Add
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Item Name*" className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400" />
            <input type="text" placeholder="SKU*" className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400" />
            <input type="number" placeholder="No of Labels*" defaultValue="1" className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400" />
            <input type="text" placeholder="Header" className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400" />
            <input type="text" placeholder="Line 1" className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400" />
            <input type="text" placeholder="Line 2" className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (section === "product-library") {
    return (
      <div>
        <PanelHeader title="Product Library" description="Import products from the shared catalogue">
          <button
            type="button"
            onClick={() => showToast("Importing selected products...", "info")}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Import (0)
          </button>
        </PanelHeader>
        <div className="flex flex-col lg:flex-row border border-gray-200 rounded-lg overflow-hidden">
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
                  type="button"
                  onClick={() => showToast(`Viewing ${cat.name} category`, "info")}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded text-left"
                >
                  <span className="text-sm text-gray-700">{cat.name}</span>
                  <span className="text-xs text-gray-500">{cat.count}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => showToast("Showing all 63 categories", "info")}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              63 Categories
            </button>
          </div>
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
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "wonderchef Ultima Plus Auto Glass Gas Cooktop", qty: 1, price: "BDT 2332" },
                    { name: "Prestige Marvel Glass Top 3 Burner Gas Stove", qty: 1, price: "BDT 2750" },
                    { name: "Philips Viva Collection Air Fryer XXL", qty: 1, price: "BDT 8900" },
                  ].map((product) => (
                    <tr
                      key={product.name}
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
  }

  if (section === "import") {
    return (
      <div>
        <PanelHeader title="Import Data" description="Bring records in from a file" />
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Data Type</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>Customers</option>
              <option>Products</option>
              <option>Invoices</option>
              <option>Expenses</option>
            </select>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-2">Drag and drop your file here, or click to browse</p>
            <button
              type="button"
              onClick={() => showToast("Opening file browser...", "info")}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Choose File
            </button>
            <p className="text-xs text-gray-500 mt-2">Supported formats: CSV, XLSX</p>
          </div>
          <button
            type="button"
            onClick={() => showToast("Importing data...", "info")}
            className="w-full px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
          >
            Import
          </button>
        </div>
      </div>
    );
  }

  if (section === "export") {
    return (
      <div>
        <PanelHeader title="Export Data" description="Download your records" />
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Data Type</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>All Data</option>
              <option>Customers</option>
              <option>Products</option>
              <option>Invoices</option>
              <option>Expenses</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Export Format</label>
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
            type="button"
            onClick={() => showToast("Exporting data...", "info")}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export Data
          </button>
        </div>
      </div>
    );
  }

  if (section === "language") {
    return (
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
              type="button"
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
  }

  return null;
};

export default SettingsSectionView;
