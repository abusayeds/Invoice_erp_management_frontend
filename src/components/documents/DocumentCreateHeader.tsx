import React, { useEffect, useRef, useState } from "react";
import { Settings, ChevronDown } from "lucide-react";

export type SendMenuAction = "send" | "preview" | "print" | "new";

export const DocumentCreateHeader: React.FC<{
  title: string;
  onSettings: () => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSaveAndSend: () => void;
  saveDisabled?: boolean;
  enableSendDropdown?: boolean;
  onSendMenu?: (action: SendMenuAction) => void;
}> = ({
  title,
  onSettings,
  onCancel,
  onSaveDraft,
  onSaveAndSend,
  saveDisabled,
  enableSendDropdown,
  onSendMenu,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (action: SendMenuAction) => {
    setMenuOpen(false);
    if (action === "send") onSaveAndSend();
    else onSendMenu?.(action);
  };

  return (
    <div className="module-title-bar sticky top-0 z-20 h-12 min-h-12 max-h-12 shrink-0 overflow-hidden">
      <h1 className="text-base font-semibold text-gray-900 truncate pr-3">{title}</h1>
      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        <button
          type="button"
          onClick={onSettings}
          title="Settings"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded-md">
          Cancel
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saveDisabled}
          className="px-3 py-1 text-sm border border-gray-300 text-gray-800 rounded-md hover:bg-gray-200 disabled:opacity-40 whitespace-nowrap"
        >
          Save as Draft
        </button>
        {enableSendDropdown ? (
          <div className="relative flex" ref={menuRef}>
            <button
              type="button"
              onClick={() => pick("send")}
              disabled={saveDisabled}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-900 rounded-l-md hover:bg-gray-300 disabled:opacity-40 font-medium border border-gray-300 border-r-0 whitespace-nowrap"
            >
              Save &amp; Send
            </button>
            <button
              type="button"
              disabled={saveDisabled}
              onClick={() => setMenuOpen((o) => !o)}
              className="px-2 py-1 text-sm bg-gray-200 text-gray-900 rounded-r-md hover:bg-gray-300 disabled:opacity-40 border border-gray-300"
              aria-label="More save options"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 min-w-[180px] bg-white border border-gray-300 rounded-md shadow-xl py-1">
                {(
                  [
                    ["preview", "Save & Preview"],
                    ["print", "Save & Print"],
                    ["new", "Save & New"],
                  ] as const
                ).map(([action, label]) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => pick(action)}
                    className="w-full px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-100 text-left"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSaveAndSend}
            disabled={saveDisabled}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-40 font-medium border border-gray-300 whitespace-nowrap"
          >
            Save &amp; Send
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentCreateHeader;
