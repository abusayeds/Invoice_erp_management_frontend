import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";
import { DocumentIconButton } from "@/components/documents/DocumentIconButton";
import { PAYMENT_FIELD_CLASS, PAYMENT_NOTE_CLASS } from "./paymentFormStyles";

/** Keep the existing mailto delivery, with a consistent in-app composition panel. */
export function PaymentEmailModal({ subject: initialSubject, body: initialBody, onClose }: {
  subject: string;
  body: string;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  return <div className="fixed inset-0 z-[95] bg-black/50 p-4 flex items-start justify-center overflow-y-auto" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Email payment receipt" className="payment-form my-6 w-full max-w-2xl rounded-lg bg-white text-gray-900 shadow-xl" onMouseDown={event => event.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-gray-300 p-4"><h3 className="font-semibold">Email Payment Receipt</h3><DocumentIconButton title="Close" onClick={onClose}><X /></DocumentIconButton></div>
      <form className="space-y-4 p-6" onSubmit={event => {
        event.preventDefault();
        window.location.href = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }}>
        <label>To<input type="email" placeholder="Recipient email" value={to} onChange={event => setTo(event.target.value)} className={PAYMENT_FIELD_CLASS} /></label>
        <label>Subject<input required value={subject} onChange={event => setSubject(event.target.value)} className={PAYMENT_FIELD_CLASS} /></label>
        <label>Message<textarea rows={8} value={body} onChange={event => setBody(event.target.value)} className={PAYMENT_NOTE_CLASS} /></label>
        <p className="text-xs text-gray-500">Continue in your email app to send this message.</p>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded-md hover:bg-gray-100">Cancel</button><button type="submit" className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"><Mail className="h-4 w-4" />Open email app</button></div>
      </form>
    </section>
  </div>;
}
