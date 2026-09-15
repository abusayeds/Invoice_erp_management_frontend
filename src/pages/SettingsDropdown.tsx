/**
 * Header gear icon → dropdown. Opens the SAME real modals as before:
 * - App Settings → AppSettingsModal (full General / Modules / … tabs)
 * - PDF & Print → PdfPrintSettingsModal
 * - Other items → shared section modal (SettingsModalShell)
 */
import React, { useEffect, useRef, useState } from "react";
import { Settings, ChevronRight } from "lucide-react";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import {
  SETTINGS_NAV_ITEMS,
  type SettingsSectionId,
} from "@/features/settings/settingsConfig";
import { SettingsModalShell } from "@/features/settings/SettingsModalShell";

export const SettingsDropdown: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [activePage, setActivePage] = useState<SettingsSectionId | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const openSection = (id: SettingsSectionId) => {
    setActivePage(id);
    setShowDropdown(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowDropdown((s) => !s)}
          className="p-2 hover:bg-gray-100 rounded-md"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {SETTINGS_NAV_ITEMS.map(({ id, label }) => {
              const withChevron = id === "import" || id === "export" || id === "language";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openSection(id)}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>{label}</span>
                  {withChevron && <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Real App Settings — unchanged modal with all tabs */}
      {activePage === "app-settings" && (
        <AppSettingsModal onClose={() => setActivePage(null)} />
      )}

      {/* Real PDF & Print — same modal used across documents */}
      {activePage === "pdf-print" && (
        <PdfPrintSettingsModal onClose={() => setActivePage(null)} />
      )}

      {activePage &&
        activePage !== "app-settings" &&
        activePage !== "pdf-print" && (
          <SettingsModalShell
            section={activePage}
            onClose={() => setActivePage(null)}
            maxWidthClass={
              activePage === "product-library" || activePage === "barcode"
                ? "max-w-5xl"
                : activePage === "categories"
                  ? "max-w-2xl"
                  : "max-w-4xl"
            }
          />
        )}
    </>
  );
};

export default SettingsDropdown;
