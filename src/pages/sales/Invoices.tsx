/**
 * File: src/pages/sales/Invoices.tsx
 * Invoices page — form opens inline in right panel, not as a modal popup
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Upload,
  MoreVertical,
  Copy,
  Eye,
  Printer,
  Mail,
  MessageCircle,
  FileText,
  Truck,
  X,
  Calendar,
  DollarSign,
  CreditCard,
  Wallet,
  Building,
  Smartphone,
  CheckCircle,
  Send,
  Ban,
  PenTool,
  Activity,
  Columns,
  Receipt,
  Package,
} from "lucide-react";
import { invoiceHooks, type Invoice } from "@/services/invoices";
import { useResourceData } from "@/hooks/useResourceData";

const sampleInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "#1",
    customerName: "Spark Tech Agency",
    customerSubtitle: "Mahmudul Hasan",
    status: "Draft",
    amount: 5000,
    invoiceDate: "$1500",
    dueDate: "$1500",
    date: "24 Jul 24 PM",
    billingAddress: "Santa, santa",
    billingCity: "Bankok, 122 Bangladesh",
    billingZip: "",
    shippingMethod: "Priority Shipping",
    subTitle: "Monthly Service",
    poNumber: "124",
    currency: "$",
    items: [
      { srNo: 1, item: "Electronics", rate: 400, quantity: 24, tax: 1, discount: -2, amount: 392 },
      { srNo: 2, item: "Electronics", rate: 400, quantity: 24, tax: 1, discount: -2, amount: 392 },
      { srNo: 3, item: "Electronics", rate: 400, quantity: 24, tax: 1, discount: -2, amount: 392 },
    ],
    termsAndConditions: "",
    notes: "",
    internalNotes: "",
    subTotal: 80.0,
    shippingCost: 3.2,
    salesTax: 10.0,
    total: 93.2,
    paid: 0,
    due: 15444,
  },
  {
    id: "2",
    invoiceNumber: "#2",
    customerName: "Tech Corp",
    customerSubtitle: "John Doe",
    status: "Approved",
    amount: 5000,
    invoiceDate: "$2000",
    dueDate: "$2000",
    date: "24 Jul 24 PM",
    billingAddress: "123 Main St",
    billingCity: "New York, USA",
    billingZip: "10001",
    shippingMethod: "Standard",
    subTitle: "Monthly Service",
    poNumber: "125",
    currency: "$",
    items: [
      { srNo: 1, item: "Consulting", rate: 500, quantity: 10, tax: 1, discount: 0, amount: 5000 },
    ],
    termsAndConditions: "",
    notes: "",
    internalNotes: "",
    subTotal: 5000,
    shippingCost: 0,
    salesTax: 500,
    total: 5500,
    paid: 0,
    due: 5500,
  },
];

export const Invoices: React.FC = () => {
  const navigate = useNavigate();
  // Data layer: reads from the API when a backend is connected, otherwise
  // transparently falls back to the in-memory sample data below.
  const { items: invoices, create, update, remove } = useResourceData(
    invoiceHooks,
    { seed: sampleInvoices },
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice>(sampleInvoices[0]);

  // Keep the selected invoice valid: when the real list loads (or after deletes),
  // if the current selection isn't in the list, fall back to the first real one.
  // (Prevents the detail panel from showing stale sample data.)
  useEffect(() => {
    if (invoices.length > 0 && !invoices.some((inv) => inv.id === selectedInvoice?.id)) {
      setSelectedInvoice(invoices[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  // Form mode replaces the right panel
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Secondary modals (payment / signature / preview stay as modals)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);

  // Form data
  const [formData, setFormData] = useState<Invoice>(sampleInvoices[0]);
  const [signatureName, setSignatureName] = useState("Mahmudul Hasan");
  const [signatureTitle, setSignatureTitle] = useState("Master Card");
  const [signatureDate, setSignatureDate] = useState("3/11/2026");

  const handleInputChange = (field: keyof Invoice, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (isEditing) {
        const saved = await update(formData.id, formData);
        setSelectedInvoice({ ...formData, ...saved });
        showToast("Invoice updated!", "success");
      } else {
        const { id: _omit, ...payload } = formData;
        void _omit;
        const created = await create(payload);
        setSelectedInvoice(created);
        showToast("Invoice created!", "success");
      }
      setShowForm(false);
    } catch {
      showToast("Could not save invoice. Please try again.", "error");
    }
  };

  // Helper for the status quick-actions in the More menu.
  const setInvoiceStatus = async (status: Invoice["status"], message: string) => {
    try {
      const saved = await update(selectedInvoice.id, { ...selectedInvoice, status });
      setSelectedInvoice((prev) => ({ ...prev, ...saved, status }));
      showToast(message, "success");
    } catch {
      showToast("Could not update status.", "error");
    }
  };

  const handleEdit = () => {
    setFormData(selectedInvoice);
    setIsEditing(true);
    setShowForm(true);
    setShowMobileList(false);
  };

  const handleCreate = () => {
    setFormData({ ...sampleInvoices[0], id: "", invoiceNumber: "", customerName: "" });
    setIsEditing(false);
    setShowForm(true);
    setShowMobileList(false);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":    return "bg-red-100 text-red-700 border-red-200";
      case "Approved": return "bg-green-100 text-green-700 border-green-200";
      case "Cancelled":return "bg-gray-100 text-gray-700 border-gray-200";
      default:         return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const PaymentMethods = () => (
    <div className="flex flex-wrap gap-2">
      <div className="w-16 h-10 bg-purple-600 rounded flex items-center justify-center"><Wallet className="w-5 h-5 text-white" /></div>
      <div className="w-16 h-10 bg-blue-500 rounded flex items-center justify-center"><DollarSign className="w-5 h-5 text-white" /></div>
      <div className="w-16 h-10 bg-gray-700 rounded flex items-center justify-center"><Building className="w-5 h-5 text-white" /></div>
      <div className="w-16 h-10 bg-green-500 rounded flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
      <div className="w-16 h-10 bg-blue-600 rounded flex items-center justify-center"><Smartphone className="w-5 h-5 text-white" /></div>
      <div className="w-16 h-10 bg-gray-800 rounded flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
      <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center border border-gray-300"><CreditCard className="w-5 h-5 text-gray-600" /></div>
      <div className="w-16 h-10 bg-blue-400 rounded flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
      <div className="w-16 h-10 bg-red-500 rounded flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
    </div>
  );

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      {/* Top Summary Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-6">
            <button className="text-sm font-medium text-gray-900 border-b-2 border-blue-600 pb-2">Summary</button>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
              <option>This Year</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>Last Quarter</option>
            </select>
            <button className="p-1.5 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 10h18M3 16h18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Header — switches between view-mode actions and form-mode buttons */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: title */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {showForm ? (isEditing ? "Edit Invoice" : "New Invoice") : "Invoices"}
            </h2>
            {!showForm && invoices.length > 0 && (
              <>
                <h3 className="text-lg font-medium text-gray-700">{selectedInvoice.customerName}</h3>
                <span className="text-sm text-gray-500">{selectedInvoice.customerSubtitle}</span>
              </>
            )}
          </div>

          {/* Right: form buttons OR view action icons */}
          {showForm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { showToast("Saved as draft", "success"); setShowForm(false); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
              >
                Save as Draft
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Save & Send
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 relative overflow-x-auto max-w-full">
              <button onClick={() => showToast("Added to favorites!", "success")} className="p-2 hover:bg-gray-100 rounded-md" title="Favorite">
                <CheckCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => showToast("Column settings coming soon", "info")} className="p-2 hover:bg-gray-100 rounded-md" title="Columns">
                <Columns className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={handleEdit} className="p-2 hover:bg-gray-100 rounded-md" title="Edit Invoice">
                <Edit className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => setShowInvoicePreview(true)} className="p-2 hover:bg-gray-100 rounded-md" title="Expand">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <button onClick={() => setShowPaymentModal(true)} className="p-2 hover:bg-gray-100 rounded-md" title="Add Payment">
                <DollarSign className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => setShowInvoicePreview(true)} className="p-2 hover:bg-gray-100 rounded-md" title="View Invoice">
                <Eye className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => setShowInvoicePreview(true)} className="p-2 hover:bg-gray-100 rounded-md" title="Print">
                <Printer className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => showToast("Email sent successfully!", "success")} className="p-2 hover:bg-gray-100 rounded-md" title="Send Email">
                <Mail className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 hover:bg-gray-100 rounded-md" title="More Options">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>

              {/* More Menu Dropdown */}
              {showMoreMenu && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <button onClick={() => { showToast("Opening WhatsApp...", "info"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                  <button onClick={() => { showToast("Generating packing slip...", "info"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Packing Slip
                  </button>
                  <button onClick={() => { navigate("/sales/delivery-challan"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Delivery Note
                  </button>
                  <button onClick={async () => { const { id: _id, ...rest } = selectedInvoice; void _id; const dup = await create({ ...rest, invoiceNumber: `#${Date.now()}` }); setSelectedInvoice(dup); showToast("Invoice duplicated!", "success"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <button onClick={() => { navigate("/sales/credit-notes"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Receipt className="w-4 h-4" /> Credit Notes
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <button onClick={() => { setInvoiceStatus("Approved", "Marked as Sent!"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Send className="w-4 h-4" /> Mark as Sent
                  </button>
                  <button onClick={() => { setInvoiceStatus("Cancelled", "Marked as Void!"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Ban className="w-4 h-4" /> Mark as Void
                  </button>
                  <button onClick={() => { setInvoiceStatus("Approved", "Marked as Paid!"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Mark as Paid
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <button onClick={() => { setShowSignatureModal(true); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <PenTool className="w-4 h-4" /> Signature Request
                  </button>
                  <button onClick={() => { navigate("/reports"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Activity Log
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <button onClick={() => setShowPrintMenu(!showPrintMenu)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Printer className="w-4 h-4" /> Print Options</span>
                    <span>→</span>
                  </button>
                  {showPrintMenu && (
                    <div className="ml-4 border-l border-gray-200 pl-2">
                      <button onClick={() => { setShowInvoicePreview(true); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Single Copy</button>
                      <button onClick={() => { setShowInvoicePreview(true); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Double Copy</button>
                      <button onClick={() => { setShowInvoicePreview(true); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Triple Copy</button>
                    </div>
                  )}
                  <button onClick={() => setShowConvertMenu(!showConvertMenu)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Convert To</span>
                    <span>→</span>
                  </button>
                  {showConvertMenu && (
                    <div className="ml-4 border-l border-gray-200 pl-2">
                      <button onClick={() => { navigate("/sales/invoices"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">As Invoice</button>
                      <button onClick={() => { navigate("/sales/estimates"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">As Estimate</button>
                      <button onClick={() => { navigate("/sales/proforma-invoices"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">As Proforma Invoice</button>
                      <button onClick={() => { navigate("/sales/credit-notes"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">As Credit Note</button>
                      <button onClick={() => { navigate("/sales/estimates"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">As Quote</button>
                      <button onClick={() => { navigate("/purchase/purchase-orders"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">As Purchase Order</button>
                      <button onClick={() => { navigate("/sales/delivery-challan"); setShowMoreMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">As Delivery Challan</button>
                    </div>
                  )}
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={async () => {
                      const next = invoices.find(inv => inv.id !== selectedInvoice.id);
                      await remove(selectedInvoice.id);
                      if (next) setSelectedInvoice(next);
                      showToast("Invoice moved to trash!", "info");
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Trash
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile list toggle */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
        <button
          onClick={() => setShowMobileList(!showMobileList)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-md px-3 py-1.5"
        >
          {showMobileList ? "← Back to Details" : "☰ View Invoices"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Invoice List */}
        <div className={`${showMobileList ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-64 bg-white border-r border-gray-200`}>
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-xs mb-2">
              <span className="text-gray-600">Sort by:</span>
              <select className="px-2 py-1 border border-gray-300 rounded text-gray-700">
                <option>Date</option>
                <option>Amount</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select className="px-2 py-1 border border-gray-300 rounded text-gray-700 flex-1">
                <option>Status</option>
                <option>Draft</option>
                <option>Approved</option>
                <option>Cancelled</option>
              </select>
              <select className="px-2 py-1 border border-gray-300 rounded text-gray-700 flex-1">
                <option>Customer: All</option>
                <option>Spark Tech Agency</option>
                <option>Tech Corp</option>
              </select>
            </div>
          </div>

          {/* Invoice List */}
          <div className="flex-1 overflow-y-auto">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => {
                  setSelectedInvoice(invoice);
                  setShowForm(false);
                  setShowMobileList(false);
                }}
                className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedInvoice?.id === invoice.id && !showForm ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                  <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate max-w-[110px]">{invoice.customerName}</span>
                  <span className="text-xs text-gray-500">{invoice.date}</span>
                </div>
                <div className="mt-1">
                  <span className="text-sm font-semibold text-gray-900">${invoice.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {filteredInvoices.length === 0 && (
              <div className="py-16 px-4 text-center">
                <FileText className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No invoices</p>
                <p className="text-xs text-gray-400 mt-1">Click + below to create one</p>
              </div>
            )}
          </div>

          {/* Add Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleCreate}
              title="New invoice"
              className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 mx-auto"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Summary */}
          <div className="p-4 border-t border-gray-200 text-center">
            <div className="text-xl font-semibold text-gray-900">
              ${invoices.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              {invoices.length} {invoices.length === 1 ? "Invoice" : "Invoices"}
            </div>
          </div>
        </div>

        {/* Right Panel — shows Invoice Details OR the Create/Edit form */}
        <div className={`${showMobileList ? "hidden" : "flex"} lg:flex flex-col flex-1 overflow-y-auto p-4 sm:p-6`}>

          {showForm ? (
            /* ─── CREATE / EDIT FORM ─── */
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              {/* Row 1: Customer, Address, Invoice # */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600">
                    <option>Default Taxes (Service)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                    placeholder="Auto-generated"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Row 2: Subtitle, PO, Currency, Shipping Method */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600">
                    <option>Default Company</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO</label>
                  <input type="text" placeholder="PO Number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input type="text" placeholder="$USD" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Method</label>
                  <input type="text" placeholder="Shipping method" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>

              {/* Row 3: Invoice Date, Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <div className="relative">
                    <input type="text" placeholder="DD/MM/YYYY" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <div className="relative">
                    <input type="text" placeholder="DD/MM/YYYY" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Payment Method</label>
                  <button className="text-gray-400 hover:text-gray-600"><Edit className="w-4 h-4" /></button>
                </div>
                {PaymentMethods()}
              </div>

              {/* Items Table */}
              <div className="mb-6 overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Sr. No.</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Items</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Tax</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Discount</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-3">01</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span>Electronics</span>
                          <button className="text-gray-400 hover:text-gray-600"><Edit className="w-4 h-4" /></button>
                        </div>
                        <div className="text-xs text-gray-500">Description</div>
                      </td>
                      <td className="px-3 py-3">23</td>
                      <td className="px-3 py-3">$40000</td>
                      <td className="px-3 py-3">
                        <select className="border border-gray-300 rounded px-2 py-1 text-xs"><option>Tax</option></select>
                      </td>
                      <td className="px-3 py-3">2%</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span>$32000</span>
                          <button className="text-green-600 hover:text-green-700"><Plus className="w-4 h-4" /></button>
                          <button className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Add Product/Services */}
              <div className="flex gap-3 mb-6">
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Add Product
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Add Services
                </button>
              </div>

              {/* Terms, Notes, Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Sub Total</span><span className="text-blue-600">$80.00</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Shipping Cost</span><span className="text-blue-600">$3.20</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Sales Tax 4% on 80.00</span><span className="text-blue-600">$10.00</span></div>
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1"><span className="text-gray-900">Total</span><span className="text-blue-600">$93.20</span></div>
                  </div>
                </div>
              </div>

              {/* Internal Notes & Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                  <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <button className="w-full py-8 border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:border-gray-400 hover:text-gray-500 flex flex-col items-center justify-center gap-2">
                    <Plus className="w-6 h-6" />
                    <span className="text-sm">Upload Computer</span>
                  </button>
                </div>
              </div>

              {/* Bottom save buttons (duplicate of header for convenience when scrolled down) */}
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-gray-200">
                <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">Cancel</button>
                <button onClick={() => { showToast("Saved as draft", "success"); setShowForm(false); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">Save as Draft</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Save & Send</button>
              </div>
            </div>

          ) : invoices.length === 0 ? (
            /* ─── EMPTY STATE (no invoices) ─── */
            <div className="flex flex-1 flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No invoices yet</h3>
              <p className="text-sm text-gray-500 mt-1 mb-5">Create your first invoice to get started.</p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" /> New Invoice
              </button>
            </div>
          ) : (
            /* ─── INVOICE DETAIL VIEW ─── */
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              {/* Invoice Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-4 border-b border-gray-200">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Invoice #</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-600">${selectedInvoice.amount}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Invoice Date</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.invoiceDate}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Due</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.dueDate}</p>
                </div>
              </div>

              {/* Billing Address & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-xs text-gray-500 block mb-2">Billing Address</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.billingAddress}</p>
                  <p className="text-sm text-gray-900">{selectedInvoice.billingCity}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500">Payment Method</label>
                    <button onClick={() => navigate("/settings")} className="text-gray-400 hover:text-gray-600" title="Edit payment methods">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                  {PaymentMethods()}
                </div>
              </div>

              {/* Sub Title, Shipping, PO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Sub Title</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.subTitle}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Shipping Method</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.shippingMethod}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">P.O. #</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.poNumber}</p>
                </div>
              </div>

              {/* Items Table + Totals */}
              <div className="flex flex-col lg:flex-row gap-6 mb-6">
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Sr.No</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Items</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Rate</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Quantity</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Tax</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Discount</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="px-2 py-3 text-gray-900">{item.srNo}</td>
                          <td className="px-2 py-3 text-gray-900">{item.item}</td>
                          <td className="px-2 py-3 text-gray-900">${item.rate.toFixed(2)}</td>
                          <td className="px-2 py-3 text-gray-900">{item.quantity}</td>
                          <td className="px-2 py-3 text-gray-900">{item.tax}</td>
                          <td className="px-2 py-3 text-gray-900">{item.discount}%</td>
                          <td className="px-2 py-3 text-gray-900">${item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="w-64 flex-shrink-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Sub Total</span><span className="text-blue-600">${selectedInvoice.subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Shipping Cost</span><span className="text-blue-600">${selectedInvoice.shippingCost.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Sales Tax 4% on 80.00</span><span className="text-blue-600">${selectedInvoice.salesTax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2 mt-2"><span className="text-gray-900">Total</span><span className="text-blue-600">${selectedInvoice.total.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              {/* Terms & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Terms & Conditions</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.termsAndConditions || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Notes</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.notes || "—"}</p>
                </div>
              </div>

              {/* Internal Notes & Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Internal Notes</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.internalNotes || "—"}</p>
                </div>
                <div>
                  <button
                    onClick={() => showToast("File upload coming soon", "info")}
                    className="w-full py-8 border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:border-gray-400 hover:text-gray-500 flex flex-col items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-sm">Upload Computer</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Add Payment Modal (stays as modal) ─── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Payment</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
                <button onClick={() => { showToast("Payment saved!", "success"); setShowPaymentModal(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment # <span className="text-red-500">*</span></label>
                <input type="text" defaultValue="2" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <input type="text" defaultValue={selectedInvoice.customerName} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="text" defaultValue="3/11/2026" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600">
                    <option>Master Card</option>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div className="border border-gray-200 rounded-md p-4 mb-4">
                <div className="text-sm text-gray-500 mb-2">$0.00 Due</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full payment</label>
                    <input type="text" defaultValue="$0.00" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachment</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button className="py-8 border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:border-gray-400 flex flex-col items-center justify-center gap-2">
                    <Plus className="w-6 h-6" /><span className="text-sm">Upload Computer</span>
                  </button>
                  <button className="py-8 border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:border-gray-400 flex flex-col items-center justify-center gap-2">
                    <Plus className="w-6 h-6" /><span className="text-sm">Upload Document</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Customer Signature Modal ─── */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customer Signature</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSignatureModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
                <button onClick={() => { showToast("Signature saved!", "success"); setShowSignatureModal(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Done</button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <div className="relative">
                    <input type="text" value={signatureDate} onChange={(e) => setSignatureDate(e.target.value)} className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="rounded border-gray-300" /> Receiver's Signature
                </label>
              </div>
              <div className="border-2 border-gray-300 rounded-md h-40 mb-4 bg-gray-50"></div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-6 h-6 bg-black rounded"></div>
                  <span className="text-sm text-gray-700">Thickness</span>
                </div>
                <input type="range" min="1" max="10" className="flex-1" />
                <button className="text-gray-400 hover:text-gray-600"><Upload className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Invoice Preview Modal ─── */}
      {showInvoicePreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowInvoicePreview(false)} className="p-2 hover:bg-gray-100 rounded-md">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Invoice {selectedInvoice.invoiceNumber}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate("/settings")} className="p-2 hover:bg-gray-100 rounded-md" title="Settings"><Columns className="w-5 h-5 text-gray-600" /></button>
                <button onClick={() => showToast("Invoice sent!", "success")} className="p-2 hover:bg-gray-100 rounded-md" title="Send"><Send className="w-5 h-5 text-gray-600" /></button>
                <button onClick={() => showToast("Share link copied!", "success")} className="p-2 hover:bg-gray-100 rounded-md" title="Share"><Upload className="w-5 h-5 text-gray-600" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-gray-100">
              <div className="bg-white shadow-lg mx-auto" style={{ width: "595px", minHeight: "842px" }}>
                <div className="relative">
                  <div className="absolute top-0 left-0 w-0 h-0 border-t-[60px] border-t-black border-r-[60px] border-r-transparent"></div>
                </div>
                <div className="px-12 pt-16 pb-8">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-4">INVOICE</h1>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-semibold">Invoice #:</span> {selectedInvoice.invoiceNumber}</p>
                        <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}</p>
                        <p><span className="font-semibold">Outstanding:</span> ${selectedInvoice.due.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right border border-gray-300 p-3">
                      <div className="text-xs font-semibold text-gray-700 mb-1">P.O. #</div>
                      <div className="text-sm">{selectedInvoice.poNumber}</div>
                      <div className="text-xs font-semibold text-gray-700 mt-2 mb-1">Date</div>
                      <div className="text-sm">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 mb-2">Info.</h3>
                      <div className="text-sm text-gray-900">
                        <p className="font-semibold">Your Company Name</p>
                        <p>123 Business Street</p>
                        <p>City, State ZIP</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 mb-2">Invoice To.</h3>
                      <div className="text-sm text-gray-900">
                        <p className="font-semibold">{selectedInvoice.customerName}</p>
                        <p>{selectedInvoice.customerSubtitle}</p>
                        <p>{selectedInvoice.billingAddress}</p>
                        <p>{selectedInvoice.billingCity}</p>
                      </div>
                    </div>
                  </div>
                  <table className="w-full text-sm border-collapse mb-8">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="text-left py-2 px-3 text-xs"># Items</th>
                        <th className="text-left py-2 px-3 text-xs">Quantity</th>
                        <th className="text-right py-2 px-3 text-xs">Unit Price</th>
                        <th className="text-right py-2 px-3 text-xs">Discount</th>
                        <th className="text-right py-2 px-3 text-xs">Tax</th>
                        <th className="text-right py-2 px-3 text-xs">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="py-3 px-3"><div className="font-semibold">{idx + 1} {item.item}</div></td>
                          <td className="py-3 px-3">{item.quantity}</td>
                          <td className="py-3 px-3 text-right">${item.rate.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right">{item.discount}%</td>
                          <td className="py-3 px-3 text-right">{item.tax}%</td>
                          <td className="py-3 px-3 text-right">${item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end mb-8">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Sub Total</span><span className="font-semibold">${selectedInvoice.subTotal.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Tax</span><span className="font-semibold">${selectedInvoice.salesTax.toFixed(2)}</span></div>
                      <div className="flex justify-between pt-2 border-t border-gray-300"><span className="font-bold text-gray-900">Invoice Total</span><span className="font-bold text-gray-900">${selectedInvoice.total.toFixed(2)}</span></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-xs font-bold text-gray-700 mb-2">Terms & Conditions</h3>
                    <p className="text-xs text-gray-600">{selectedInvoice.termsAndConditions || "Payment is due within 30 days."}</p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">Thank you for your business!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
