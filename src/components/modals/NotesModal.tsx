import React, { useState } from "react";

const DOCUMENT_TYPES = [
  "Invoice",
  "Sales Receipt",
  "Proforma Invoice",
  "Estimate",
  "Delivery Challan",
  "Purchase Order",
  "Credit Note",
  "Bill",
  "Debit Note",
];

interface NotesModalProps {
  onClose: () => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({ onClose }) => {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(DOCUMENT_TYPES.map((d) => [d, ""]))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Notes</h2>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {DOCUMENT_TYPES.map((doc) => (
            <div key={doc} className="relative">
              <textarea
                value={values[doc]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [doc]: e.target.value }))
                }
                rows={4}
                placeholder=" "
                className="w-full border border-gray-300 rounded-lg px-3 pt-6 pb-2 text-sm text-gray-800 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 peer"
              />
              <label className="absolute top-2 left-3 text-xs text-gray-500 pointer-events-none">
                {doc}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
