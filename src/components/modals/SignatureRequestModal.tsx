/**
 * File: src/components/modals/SignatureRequestModal.tsx
 * "Signature Request" email composer (matches the reference): To chip with the
 * customer's email, Cc & Bcc, Subject/From lines, formatting toolbar, body with
 * the blue document button, attachment chip and Powered-by checkbox.
 * Generic over the document kind — pass docLabel ("Estimate", "Delivery Challan"…).
 */

import React, { useEffect } from "react";
import { Settings, X, FileText, Paperclip, Bold, Italic, Underline } from "lucide-react";

export const SignatureRequestModal: React.FC<{
  docLabel: string;
  number: string;
  customer: any;
  onClose: () => void;
  onSend: () => void;
}> = ({ docLabel, number, customer, onClose, onSend }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  const n = number.replace("#", "");
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-2xl my-10 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 truncate">Signature Request for {docLabel} #: {n} from info</h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={() => { onSend(); onClose(); }} className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">Send</button>
          </div>
        </div>
        <div className="px-5 py-3 space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">To:</span>
              {customer.email ? (
                <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-300 rounded-full pl-3 pr-1.5 py-0.5 text-gray-800">
                  {customer.email}
                  <span className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 text-white"><X className="w-3 h-3" /></span>
                </span>
              ) : <span className="text-gray-400">—</span>}
            </div>
            <button className="text-xs text-gray-500 hover:text-gray-700">Cc &amp; Bcc</button>
          </div>
          <div className="border-b border-gray-200 pb-2"><span className="text-gray-500">Subject:</span> <span className="text-gray-800">Signature Request for {docLabel} #: {n} from info</span></div>
          <div className="border-b border-gray-200 pb-2"><span className="text-gray-500">From:</span> <span className="text-gray-800">info@inovoic.com</span></div>
          <div className="flex items-center gap-1 border-b border-gray-200 pb-2 text-gray-500">
            <select className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"><option>Size</option></select>
            <select className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"><option>Font</option></select>
            {[Bold, Italic, Underline].map((Ic, i) => <button key={i} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"><Ic className="w-4 h-4" /></button>)}
          </div>
          <div className="py-3 space-y-4 text-gray-800">
            <div>Dear {customer.name || "Customer"}</div>
            <div>Signature Request for {docLabel} #: {n}</div>
            <button className="w-64 py-2.5 bg-gray-100 border border-gray-300 rounded-md text-blue-600 font-semibold hover:bg-gray-200">{docLabel} # {n}</button>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
          <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-800">
            <FileText className="w-3.5 h-3.5 text-blue-600" /> {docLabel} #{n} <X className="w-3 h-3 text-gray-500" />
          </span>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Paperclip className="w-4 h-4" /></button>
        </div>
        <label className="flex items-center gap-2 px-5 pb-4 text-sm text-gray-700">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Qayd
        </label>
      </div>
    </div>
  );
};

export default SignatureRequestModal;
