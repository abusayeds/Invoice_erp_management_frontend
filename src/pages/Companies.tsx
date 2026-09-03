import React, { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { toArray } from "@/services/_http";
import { db } from "@/lib/db/db";
import { PdfPrintSettingsModal } from "../components/modals/PdfPrintSettingsModal";
import { AppSettingsModal } from "../components/modals/AppSettingsModal";
import { PaymentMethodsModal } from "../components/modals/PaymentMethodsModal";
import { TermsConditionsModal } from "../components/modals/TermsConditionsModal";
import { TaxesModal } from "../components/modals/TaxesModal";
import { BankDetailsModal } from "../components/modals/BankDetailsModal";
import { NotesModal } from "../components/modals/NotesModal";
import { SignatureModal } from "../components/modals/SignatureModal";
import { TeamModal } from "../components/modals/TeamModal";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  ChevronDown,
  Settings,
  FileText,
  CreditCard,
  FileCheck,
  Percent,
  Mail,
  Building2,
  StickyNote,
  PenLine,
  Users,
} from "lucide-react";

interface Company {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  website: string;
  billingAddress: string;
  shippingAddress?: string;
  sameAsBilling?: boolean;
  regNo: string;
  vat: string;
  paymentTermsSales: string;
  paymentTermsPurchase: string;
  startFiscalYear: string;
  isOwner: boolean;
}

// ── Backend wiring (/company-register/*) ─────────────────────────────────────
const mapCompany = (d: any): Company => ({
  id: String(d._id),
  businessName: d.business_name ?? "",
  email: d.email ?? "",
  phone: d.phone ?? "",
  mobile: d.mobile ?? "",
  fax: d.fax ?? "",
  website: d.website ?? "",
  billingAddress: d.billing_address ?? "",
  shippingAddress: d.shipping_address ?? "",
  sameAsBilling: !!d.same_as_billing,
  regNo: d.reg_no ?? "",
  vat: d.vat ?? "",
  paymentTermsSales: d.payment_terms_sales ?? "",
  paymentTermsPurchase: d.payment_terms_purchase ?? "",
  startFiscalYear: d.start_fiscal_year ?? "January",
  isOwner: !!d.is_owner,
});
const companyBody = (c: Company) => ({
  business_name: c.businessName,
  email: c.email,
  phone: c.phone,
  mobile: c.mobile,
  fax: c.fax,
  website: c.website,
  billing_address: c.billingAddress,
  shipping_address: c.shippingAddress ?? "",
  same_as_billing: !!c.sameAsBilling,
  reg_no: c.regNo,
  vat: c.vat,
  payment_terms_sales: c.paymentTermsSales,
  payment_terms_purchase: c.paymentTermsPurchase,
  start_fiscal_year: c.startFiscalYear,
  is_owner: !!c.isOwner,
});

/* App Settings modal is the shared component (src/components/modals/AppSettingsModal.tsx). */

/* ── Bottom Setting Cards ───────────────────────────────────────── */

interface SettingCard {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tab: string;
}

const SETTING_CARDS: SettingCard[] = [
  {
    icon: <Settings className="w-5 h-5 text-white" />,
    title: "Currency & Format",
    tab: "Currency & Format",
  },
  {
    icon: <FileText className="w-5 h-5 text-white" />,
    title: "PDF & Print Settings",
    subtitle: "Standard",
    tab: "Printer",
  },
  {
    icon: <CreditCard className="w-5 h-5 text-white" />,
    title: "Payment Methods",
    tab: "General",
  },
  {
    icon: <FileCheck className="w-5 h-5 text-white" />,
    title: "Terms & Conditions",
    tab: "General",
  },
  {
    icon: <Percent className="w-5 h-5 text-white" />,
    title: "Taxes",
    tab: "General",
  },
  {
    icon: <Mail className="w-5 h-5 text-white" />,
    title: "Email Templates",
    subtitle: "Dear <customer> <no...",
    tab: "General",
  },
  {
    icon: <Building2 className="w-5 h-5 text-white" />,
    title: "Bank Details",
    tab: "General",
  },
  {
    icon: <StickyNote className="w-5 h-5 text-white" />,
    title: "Notes",
    tab: "General",
  },
  {
    icon: <PenLine className="w-5 h-5 text-white" />,
    title: "Signature",
    tab: "General",
  },
  {
    icon: <Users className="w-5 h-5 text-white" />,
    title: "Team",
    subtitle: "1 Member",
    tab: "General",
  },
];

/* ── Main Companies Page ───────────────────────────────────────── */

export const Companies: React.FC = () => {
  const [showMobileList, setShowMobileList] = useState(true);
  const [companies, setCompaniesState] = useState<Company[]>([
    {
      id: "1",
      businessName: "info",
      email: "info@inovoic.com",
      phone: "",
      mobile: "",
      fax: "",
      website: "",
      billingAddress: "Bangladesh",
      regNo: "",
      vat: "",
      paymentTermsSales: "",
      paymentTermsPurchase: "",
      startFiscalYear: "January",
      isOwner: true,
    },
    {
      id: "2",
      businessName: "info",
      email: "info@inovoic.com",
      phone: "",
      mobile: "",
      fax: "",
      website: "",
      billingAddress: "Bangladesh",
      regNo: "",
      vat: "",
      paymentTermsSales: "",
      paymentTermsPurchase: "",
      startFiscalYear: "January",
      isOwner: true,
    },
  ]);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(companies[0]);

  const setCompanies = (list: Company[]) => {
    setCompaniesState(list);
    db.meta.put({ key: "company:list", value: list });
  };
  // Load the real company register from the backend (falls back to meta cache).
  const loadCompanies = async (): Promise<boolean> => {
    try {
      const res = await api.raw.get("/company-register/all");
      const arr = toArray<any>(res.data);
      const list = arr.map(mapCompany);
      if (list.length) {
        setCompanies(list);
        setSelectedCompany(list[0]);
      }
      return true;
    } catch {
      return false;
    }
  };
  useEffect(() => {
    loadCompanies().then((ok) => {
      if (ok) return;
      db.meta.get("company:list").then((row) => {
        const stored = row?.value as Company[] | undefined;
        if (stored?.length) {
          setCompaniesState(stored);
          setSelectedCompany(stored[0]);
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<"info" | "add">("info");
  const [isEditing, setIsEditing] = useState(false);
  const [settingsModal, setSettingsModal] = useState<{ open: boolean; tab: string }>({
    open: false,
    tab: "Currency & Format",
  });
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTaxesModal, setShowTaxesModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const emptyForm: Company = {
    id: "",
    businessName: "",
    email: "",
    phone: "",
    mobile: "",
    fax: "",
    website: "",
    billingAddress: "",
    regNo: "",
    vat: "",
    paymentTermsSales: "",
    paymentTermsPurchase: "",
    startFiscalYear: "January",
    isOwner: false,
  };

  const [formData, setFormData] = useState<Company>(emptyForm);

  const handleAddCompany = () => {
    setActiveTab("add");
    setIsEditing(false);
    setFormData(emptyForm);
  };

  const handleSaveCompany = async () => {
    try {
      if (formData.id) {
        await api.raw.patch(`/company-register/${formData.id}`, companyBody(formData));
      } else {
        await api.raw.post("/company-register/create", companyBody(formData));
      }
      await loadCompanies();
      setActiveTab("info");
      setIsEditing(false);
      return;
    } catch { /* fall through to local */ }
    if (formData.id) {
      setCompanies(companies.map((c) => (c.id === formData.id ? formData : c)));
      setSelectedCompany(formData);
    } else {
      const newCompany = { ...formData, id: Date.now().toString() };
      setCompanies([...companies, newCompany]);
      setSelectedCompany(newCompany);
    }
    setActiveTab("info");
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (selectedCompany) {
      setFormData(selectedCompany);
      setActiveTab("add");
      setIsEditing(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    try {
      await api.raw.delete(`/company-register/${selectedCompany.id}`);
      await loadCompanies();
      return;
    } catch { /* fall through to local */ }
    const remaining = companies.filter((c) => c.id !== selectedCompany.id);
    setCompanies(remaining);
    setSelectedCompany(remaining[0] ?? null);
  };

  const handleCancel = () => {
    setActiveTab("info");
    setIsEditing(false);
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setActiveTab("info");
    setShowMobileList(false);
  };

  return (
    <div className="flex-1 flex flex-col m-2 bg-white border border-gray-300 shadow-sm overflow-hidden">
      {/* App Settings Modal */}
      {settingsModal.open && (
        <AppSettingsModal
          initialTab={settingsModal.tab}
          onClose={() => setSettingsModal({ open: false, tab: "Currency & Format" })}
        />
      )}

      {/* PDF & Print Settings Modal */}
      {showPdfModal && (
        <PdfPrintSettingsModal onClose={() => setShowPdfModal(false)} />
      )}

      {/* Payment Methods Modal */}
      {showPaymentModal && (
        <PaymentMethodsModal onClose={() => setShowPaymentModal(false)} />
      )}

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <TermsConditionsModal onClose={() => setShowTermsModal(false)} />
      )}

      {/* Taxes Modal */}
      {showTaxesModal && (
        <TaxesModal onClose={() => setShowTaxesModal(false)} />
      )}

      {/* Bank Details Modal */}
      {showBankDetailsModal && (
        <BankDetailsModal onClose={() => setShowBankDetailsModal(false)} />
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <NotesModal onClose={() => setShowNotesModal(false)} />
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal onClose={() => setShowSignatureModal(false)} />
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <TeamModal
          onClose={() => setShowTeamModal(false)}
          companyEmail={selectedCompany?.email}
        />
      )}

      {/* Mobile Toggle */}
      <div className="lg:hidden bg-white border-b border-gray-300 px-4 py-2">
        <button
          onClick={() => setShowMobileList(!showMobileList)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-md px-3 py-1.5"
        >
          {showMobileList ? "← Back to Details" : "☰ View Companies"}
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT PANEL */}
        <div
          className={`${showMobileList ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-72 bg-white border-r border-gray-200`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-300">
            <h2 className="text-base font-semibold text-gray-900">Companies</h2>
            <button
              onClick={handleAddCompany}
              className="p-1 hover:bg-gray-100 rounded-md text-gray-500"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Sort */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative inline-block">
              <button className="flex items-center gap-1 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1.5 bg-white hover:bg-gray-50">
                Sort by | Name
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanySelect(company)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedCompany?.id === company.id ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="w-9 h-9 bg-blue-600 rounded flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {company.businessName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {company.businessName}
                  </div>
                </div>
                {company.isOwner && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                    Owner
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Add Button */}
          <div className="p-4 flex justify-center border-t border-gray-100">
            <button
              onClick={handleAddCompany}
              className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          className={`${showMobileList ? "hidden" : "flex"} lg:flex flex-col flex-1 overflow-y-auto bg-white`}
        >
          {activeTab === "info" && selectedCompany ? (
            <>
              {/* Info Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
                <h2 className="text-base font-semibold text-gray-900">
                  {selectedCompany.businessName}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    title="Delete company"
                    className="p-2 hover:bg-gray-100 rounded-md text-gray-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleEdit}
                    title="Edit company"
                    className="p-2 hover:bg-gray-100 rounded-md text-gray-500"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Fields */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Business Name</p>
                    <p className="text-sm text-gray-900">{selectedCompany.businessName}</p>
                    <div className="border-b border-gray-300 mt-2" />
                  </div>
                  <div className="flex justify-end">
                    <div className="w-14 h-14 bg-blue-600 rounded flex items-center justify-center text-white font-semibold">
                      {selectedCompany.businessName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <a href={`mailto:${selectedCompany.email}`} className="text-sm text-blue-600 hover:underline">
                    {selectedCompany.email || <span className="text-gray-400">—</span>}
                  </a>
                  <div className="border-b border-gray-300 mt-2" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="text-sm text-gray-900">{selectedCompany.phone || <span className="text-gray-400">—</span>}</p>
                    <div className="border-b border-gray-300 mt-2" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Mobile</p>
                    <p className="text-sm text-gray-900">{selectedCompany.mobile || <span className="text-gray-400">—</span>}</p>
                    <div className="border-b border-gray-300 mt-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fax</p>
                    <p className="text-sm text-gray-900">{selectedCompany.fax || <span className="text-gray-400">—</span>}</p>
                    <div className="border-b border-gray-300 mt-2" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Website</p>
                    <p className="text-sm text-gray-900">{selectedCompany.website || <span className="text-gray-400">—</span>}</p>
                    <div className="border-b border-gray-300 mt-2" />
                  </div>
                </div>

                {/* Address Section */}
                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Address</h3>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Billing Address</p>
                    <p className="text-sm text-gray-900 whitespace-pre-line">
                      {selectedCompany.billingAddress || <span className="text-gray-400">—</span>}
                    </p>
                    <div className="border-b border-gray-300 mt-2" />
                  </div>
                </div>

                {/* Settings Section */}
                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Settings</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Reg No</p>
                      <p className="text-sm text-gray-900">{selectedCompany.regNo || <span className="text-gray-400">—</span>}</p>
                      <div className="border-b border-gray-300 mt-2" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">VAT</p>
                      <p className="text-sm text-gray-900">{selectedCompany.vat || <span className="text-gray-400">—</span>}</p>
                      <div className="border-b border-gray-300 mt-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Payment Terms (Sales)</p>
                      <p className="text-sm text-gray-900">{selectedCompany.paymentTermsSales || <span className="text-gray-400">—</span>}</p>
                      <div className="border-b border-gray-300 mt-2" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Payment Terms (Purchases)</p>
                      <p className="text-sm text-gray-900">{selectedCompany.paymentTermsPurchase || <span className="text-gray-400">—</span>}</p>
                      <div className="border-b border-gray-300 mt-2" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">Start Fiscal Year</p>
                    <p className="text-sm text-gray-900">{selectedCompany.startFiscalYear}</p>
                    <div className="border-b border-gray-300 mt-2" />
                  </div>
                </div>

                {/* Setting Cards Grid */}
                <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {SETTING_CARDS.map((card) => (
                    <button
                      key={card.title}
                      onClick={() => {
                        if (card.title === "PDF & Print Settings") setShowPdfModal(true);
                        else if (card.title === "Payment Methods") setShowPaymentModal(true);
                        else if (card.title === "Terms & Conditions") setShowTermsModal(true);
                        else if (card.title === "Taxes") setShowTaxesModal(true);
                        else if (card.title === "Bank Details") setShowBankDetailsModal(true);
                        else if (card.title === "Notes") setShowNotesModal(true);
                        else if (card.title === "Signature") setShowSignatureModal(true);
                        else if (card.title === "Team") setShowTeamModal(true);
                        else setSettingsModal({ open: true, tab: card.tab });
                      }}
                      className="flex flex-col items-start p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left"
                    >
                      <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                        {card.icon}
                      </div>
                      <p className="text-xs font-medium text-gray-800 leading-tight">
                        {card.title}
                      </p>
                      {card.subtitle && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate w-full">
                          {card.subtitle}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Add / Edit Form */
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
                <h2 className="text-base font-semibold text-gray-900">
                  {isEditing ? "Edit Company" : "Add Company"}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="text-sm text-gray-600 hover:text-gray-900 px-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCompany}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* logo */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="w-24 h-24 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                  >
                    {formData.businessName ? (
                      <span className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-semibold text-lg">
                        {formData.businessName.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                        <Plus className="w-4 h-4" />
                      </span>
                    )}
                    <span className="text-xs font-medium">Add Logo</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Mobile</label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Fax</label>
                    <input
                      type="text"
                      value={formData.fax}
                      onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Website</label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1.5">Billing</label>
                      <textarea
                        rows={4}
                        placeholder={"Street 1\nStreet 2\nCity, State, Zip\nCountry"}
                        value={formData.billingAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billingAddress: e.target.value,
                            shippingAddress: formData.sameAsBilling ? e.target.value : formData.shippingAddress,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-800">Shipping</label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.sameAsBilling}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sameAsBilling: e.target.checked,
                                shippingAddress: e.target.checked ? formData.billingAddress : formData.shippingAddress,
                              })
                            }
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                          Same as Billing
                        </label>
                      </div>
                      <textarea
                        rows={4}
                        placeholder={"Street 1\nStreet 2\nCity, State, Zip\nCountry"}
                        value={formData.shippingAddress || ""}
                        disabled={!!formData.sameAsBilling}
                        onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                        className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.sameAsBilling ? "bg-gray-50 text-gray-400" : ""}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Settings</h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Reg. No</label>
                      <input
                        type="text"
                        value={formData.regNo}
                        onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Tax ID</label>
                      <input
                        type="text"
                        value={formData.vat}
                        onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Payment Terms (Sales)
                      </label>
                      <input
                        type="text"
                        value={formData.paymentTermsSales}
                        onChange={(e) => setFormData({ ...formData, paymentTermsSales: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Payment Terms (Purchases)
                      </label>
                      <input
                        type="text"
                        value={formData.paymentTermsPurchase}
                        onChange={(e) => setFormData({ ...formData, paymentTermsPurchase: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Start Fiscal Year
                    </label>
                    <select
                      value={formData.startFiscalYear}
                      onChange={(e) => setFormData({ ...formData, startFiscalYear: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[
                        "January","February","March","April","May","June",
                        "July","August","September","October","November","December",
                      ].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
