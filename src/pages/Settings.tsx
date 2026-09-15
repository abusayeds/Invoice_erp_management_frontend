/**
 * File: src/pages/Settings.tsx
 * Settings page (route: /settings) — split panel layout.
 * Section bodies come from shared `features/settings` (same as header dropdown).
 */
import React, { useState } from "react";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import {
  SETTINGS_NAV_ITEMS,
  type SettingsSectionId,
} from "@/features/settings/settingsConfig";
import { SettingsSectionView } from "@/features/settings/SettingsSectionView";

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("categories");

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
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
          <SettingsSectionView section={activeSection} />
      </div>
      </section>
    </div>
  );
};

export default SettingsPage;
