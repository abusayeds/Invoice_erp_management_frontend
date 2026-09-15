/**
 * File: src/pages/Settings.tsx
 * Settings page — same real modals as the header gear dropdown.
 * App Settings → AppSettingsModal (full tabs: General, Modules, …)
 * PDF & Print → PdfPrintSettingsModal
 * Other sections → shared SettingsSectionView
 */
import React, { useEffect, useState } from "react";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import {
  SETTINGS_NAV_ITEMS,
  type SettingsSectionId,
} from "@/features/settings/settingsConfig";
import { SettingsSectionView } from "@/features/settings/SettingsSectionView";

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("categories");
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showPdfPrint, setShowPdfPrint] = useState(false);

  // Match header dropdown: these two open the real modals.
  useEffect(() => {
    if (activeSection === "app-settings") setShowAppSettings(true);
    if (activeSection === "pdf-print") setShowPdfPrint(true);
  }, [activeSection]);

  const closeAppSettings = () => {
    setShowAppSettings(false);
    if (activeSection === "app-settings") setActiveSection("categories");
  };
  const closePdfPrint = () => {
    setShowPdfPrint(false);
    if (activeSection === "pdf-print") setActiveSection("categories");
  };

  const showInline =
    activeSection !== "app-settings" && activeSection !== "pdf-print";

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {showAppSettings && <AppSettingsModal onClose={closeAppSettings} />}
      {showPdfPrint && <PdfPrintSettingsModal onClose={closePdfPrint} />}

      <ResizableListPanel>
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
          <h2 className="text-base font-semibold text-gray-900 tracking-tight">Settings</h2>
      </div>

        <div className="flex-1 overflow-y-auto">
          {SETTINGS_NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-b border-gray-300 transition-colors ${
                  active ? "bg-gray-100 text-blue-600 font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-gray-400"}`} />
                {label}
              </button>
            );
          })}
        </div>
      </ResizableListPanel>

      <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
        <div className="h-12 flex items-center px-6 border-b border-gray-300 bg-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {SETTINGS_NAV_ITEMS.find((n) => n.id === activeSection)?.label || "Settings"}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {showInline ? (
            <SettingsSectionView section={activeSection} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className="text-sm text-gray-600">
                {activeSection === "app-settings"
                  ? "App Settings opens in the full settings dialog (same as the header gear menu)."
                  : "PDF & Print Settings opens in the full dialog (same as the header gear menu)."}
              </p>
              <button
                type="button"
                onClick={() =>
                  activeSection === "app-settings"
                    ? setShowAppSettings(true)
                    : setShowPdfPrint(true)
                }
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Open again
              </button>
            </div>
          )}
      </div>
      </section>
    </div>
  );
};

export default SettingsPage;
