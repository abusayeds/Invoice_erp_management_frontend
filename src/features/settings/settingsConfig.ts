/**
 * Shared settings section ids + nav labels used by /settings page and
 * the header SettingsDropdown modals.
 */
import type { LucideIcon } from "lucide-react";
import {
  Tag,
  FileText,
  Settings as SettingsIcon,
  Printer,
  Mail,
  Bell,
  ScanLine,
  Package,
  Download,
  Upload,
  Globe,
} from "lucide-react";

export type SettingsSectionId =
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

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
};

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
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

export const SETTINGS_APP_SECTIONS = [
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
] as const;

export const DEFAULT_SETTINGS_CATEGORIES = [
  { id: "1", name: "Maintenance" },
  { id: "2", name: "Advertising and Promotion" },
  { id: "3", name: "Utilities" },
  { id: "4", name: "Meals and Entertainment" },
  { id: "5", name: "Marketing" },
  { id: "6", name: "Depreciation" },
  { id: "7", name: "Insurance" },
  { id: "8", name: "Fees" },
  { id: "9", name: "Travel" },
];

export const SETTINGS_PROMO_TITLES = [
  "50% OFF First Month Plan",
  "20% OFF Annual Subscription",
  "Free Trial for 14 Days",
  "Refer a Friend and Get $10",
  "Buy One Get One Free",
  "30% OFF on Select Items",
  "Exclusive Member Discounts",
  "Limited Time: 10% OFF All Orders",
];

export function settingsLabel(id: SettingsSectionId): string {
  return SETTINGS_NAV_ITEMS.find((n) => n.id === id)?.label ?? "Settings";
}
