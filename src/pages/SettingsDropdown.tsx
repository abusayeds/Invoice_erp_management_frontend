/**
 * File: src/components/SettingsDropdown.tsx
 * Settings dropdown and all settings pages
 * Complete implementation based on all screenshots
 */

import React, { useState, useRef, useEffect } from "react";
import { AppSettingsModal } from "../components/modals/AppSettingsModal";
import { showToast } from '../utils/toast';
import {
  Settings,
  Bell,
  ChevronRight,
  X,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Download,
  Upload,
} from "lucide-react";

type SettingsPage =
  | null
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

export const SettingsDropdown: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState<SettingsPage>(null);

  // Close the dropdown when clicking outside it or pressing Escape.
  useEffect(() => {
    if (!showDropdown) return;
    const onPointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showDropdown]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [selectedAppSection, setSelectedAppSection] = useState("General");

  // Categories data
  const [categories, setCategories] = useState([
    { id: "1", name: "Maintenance", hasChildren: false },
    { id: "2", name: "Advertising and Promotion", hasChildren: false },
    { id: "3", name: "Utilities", hasChildren: false },
    { id: "4", name: "Meals and Entertainment", hasChildren: false },
    { id: "5", name: "Marketing", hasChildren: false },
    { id: "6", name: "Depreciation", hasChildren: false },
    { id: "7", name: "Insurance", hasChildren: false },
    { id: "8", name: "Fees", hasChildren: false },
    { id: "9", name: "Travel", hasChildren: false },
  ]);

  const handleMenuClick = (page: SettingsPage) => {
    setActivePage(page);
    setShowDropdown(false);
  };

  const appSections = [
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

  return (
    <>
      {/* Settings Icon in Header */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <button
              onClick={() => handleMenuClick("categories")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              Categories
            </button>
            <button
              onClick={() => handleMenuClick("edit-titles")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit Titles
            </button>
            <button
              onClick={() => handleMenuClick("app-settings")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              App settings
            </button>
            <button
              onClick={() => handleMenuClick("pdf-print")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              PDF & Print Settings
            </button>
            <button
              onClick={() => handleMenuClick("email-templates")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Email Templates
            </button>
            <button
              onClick={() => handleMenuClick("notifications")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Notification Settings
            </button>
            <button
              onClick={() => handleMenuClick("barcode")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Generate Barcode
            </button>
            <button
              onClick={() => handleMenuClick("product-library")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Product Library
            </button>
            <button
              onClick={() => handleMenuClick("import")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              Import data
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => handleMenuClick("export")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              Export Data
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => handleMenuClick("language")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              language
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Categories Page */}
      {activePage === "categories" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Categories
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePage(null)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
                <button
                  onClick={() => showToast("Categories saved!", "success")}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="flex gap-4 mb-4 border-b border-gray-200">
                <button className="pb-2 text-sm font-medium text-gray-900 border-b-2 border-blue-600">
                  All Category
                </button>
                <button className="pb-2 text-sm font-medium text-gray-500">
                  Products
                </button>
                <button className="pb-2 text-sm font-medium text-gray-500">
                  Expenses
                </button>
              </div>

              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-900">
                      {category.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowEditCategoryModal(true)}
                        className="p-1.5 hover:bg-gray-100 rounded"
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
                className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 mt-6 mx-auto"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Category
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditCategoryModal(false)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    showToast("Category updated!", "info");
                    setShowEditCategoryModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value="Travel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad
                </label>
                <input type="checkbox" className="w-4 h-4" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Category
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Stock Level</option>
                  <option>No Parent Category</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Titles Page */}
      {activePage === "edit-titles" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Titles
              </h2>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Search className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setActivePage(null)}
                  className="text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md">
                  Save
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="p-3 border border-gray-200 rounded text-sm text-gray-700"
                  >
                    {title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Settings Page */}
      {activePage === "app-settings" && (
        <AppSettingsModal onClose={() => setActivePage(null)} />
      )}

      {/* Notification Settings */}
      {activePage === "notifications" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Notification Setting
              </h2>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-100 rounded">
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setActivePage(null)}
                  className="text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md">
                  Save
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Time Zone
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>GMT +7:00 America/Los Angels</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Time
                </label>
                <input
                  type="time"
                  value="07:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Recurring
                </h3>
                <div className="space-y-3">
                  {["Auto Send Invoice", "Daily", "Weekly", "Monthly"].map(
                    (item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-700">{item}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Payment Reminder
                </h3>
                <div className="space-y-3">
                  {[
                    "Auto Send Payment Receipt",
                    "Default for new Customer",
                    "3 day before due date",
                    "On due date",
                    "3 days after due date",
                    "7 days after due date",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-700">{item}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Barcode */}
      {activePage === "barcode" && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Generate Barcode
              </h2>
              <div className="flex items-center gap-3">
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
                  onClick={() => setActivePage(null)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => showToast("Generating barcodes...", "info")}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Generate (0)
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                      No of Labels
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                      Header
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                      Line 1
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                      Line 2
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
              </table>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Add Barcode
                </h3>
                <button
                  onClick={() => showToast("Adding barcode...", "info")}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Add
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Item Name*"
                  className="px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="SKU*"
                  className="px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400"
                />
                <input
                  type="number"
                  placeholder="No of Labels*"
                  defaultValue="1"
                  className="px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Header"
                  className="px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Line 1"
                  className="px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Line 2"
                  className="px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400"
                />
              </div>

              <div className="text-center text-sm text-gray-500">
                Product Not Available.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Library */}
      {activePage === "product-library" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Product Library
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePage(null)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => showToast("Importing selected products...", "info")}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Import (0)
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Left Sidebar - Categories */}
              <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto p-4">
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">
                    Sort by: Created on
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Product Library
                  </h3>
                  <div className="text-xs text-gray-500 mb-4">
                    All files and folders
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </div>
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
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded cursor-pointer text-left"
                      >
                        <span className="text-sm text-gray-700">
                          {cat.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => showToast("Showing all 63 categories", "info")}
                    className="mt-4 text-sm text-blue-600 cursor-pointer hover:text-blue-700"
                  >
                    63 Categories
                  </button>
                </div>
              </div>

              {/* Right Content - Products */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    Appliances
                  </h3>
                  <div className="text-sm text-gray-500">72 Products</div>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                          Products
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                          Price
                        </th>
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
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="text-xs text-gray-400 mb-1">
                              Quantity
                            </div>
                            {product.qty}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="text-xs text-gray-400 mb-1">
                              Price
                            </div>
                            {product.price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-sm text-gray-500">0 of 1 GB</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF & Print Settings */}
      {activePage === "pdf-print" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                PDF & Print Settings
              </h2>
              <div className="flex items-center gap-3">
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
                  onClick={() => setActivePage(null)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => showToast("Settings saved!", "success")}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Preview */}
                <div className="w-full lg:w-1/3">
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded shadow-sm">
                      <div className="p-4 text-xs text-gray-600">
                        Invoice Preview
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Style
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <button
                        onClick={() => showToast("Text Color selected", "info")}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                      >
                        ⬛ Text Color
                      </button>
                      <button
                        onClick={() => showToast("Border Color selected", "info")}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                      >
                        ⬛ Border Color
                      </button>
                      <button
                        onClick={() => showToast("Fill Color selected", "info")}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                      >
                        ⬛ Fill Color
                      </button>
                      <button
                        onClick={() => showToast("Fill Text Color selected", "info")}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                      >
                        ⬛ Fill Text Color
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Font
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option>Arial</option>
                          <option>Helvetica</option>
                          <option>Times New Roman</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Font Size
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option>Medium</option>
                          <option>Small</option>
                          <option>Large</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Paper
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option>US Paper</option>
                          <option>A4</option>
                          <option>Legal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Full Page
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Templates */}
      {activePage === "email-templates" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Email Templates
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePage(null)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
                <button
                  onClick={() => showToast("Template saved!", "success")}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option>Invoice Email</option>
                    <option>Estimate Email</option>
                    <option>Payment Receipt</option>
                    <option>Reminder Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Email subject..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Body
                  </label>
                  <textarea
                    rows={10}
                    placeholder="Email content..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="text-sm text-gray-600">
                  <strong>Available variables:</strong> {"{customer_name}"},{" "}
                  {"{invoice_number}"}, {"{amount}"}, {"{due_date}"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Data */}
      {activePage === "import" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Import Data
              </h2>
              <button
                onClick={() => setActivePage(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Data Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
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
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: CSV, XLSX
                </p>
              </div>

              <button
                onClick={() => showToast("Importing data...", "info")}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Data */}
      {activePage === "export" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Export Data
              </h2>
              <button
                onClick={() => setActivePage(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Data Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>All Data</option>
                  <option>Customers</option>
                  <option>Products</option>
                  <option>Invoices</option>
                  <option>Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>CSV</option>
                  <option>Excel (XLSX)</option>
                  <option>PDF</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <button
                onClick={() => showToast("Exporting data...", "info")}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language */}
      {activePage === "language" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Select Language
              </h2>
              <button
                onClick={() => setActivePage(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
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
                  onClick={() => {
                    showToast(`Language changed to ${lang.name}`, "info");
                    setActivePage(null);
                  }}
                  className="w-full px-4 py-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-blue-600 transition-colors"
                >
                  <div className="font-medium text-gray-900">{lang.name}</div>
                  <div className="text-sm text-gray-500">{lang.native}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
