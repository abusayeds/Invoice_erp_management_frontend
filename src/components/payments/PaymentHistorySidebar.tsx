import { useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { ListSidebarFooter, LIST_PAGE_SIZE } from "@/components/ui/ListSidebarFooter";
import { ListFilterDropdown } from "@/components/ui/ListFilterDropdown";
import { dateRangeFor, DATE_FILTER_OPTIONS } from "@/lib/listDateRange";

type HistoryRow = { id: string; serial: string; timestamp: number; amount: number; method: string; notes: string };

/** Presentation only: filters the already loaded payment history, keeping its API and actions intact. */
export function PaymentHistorySidebar<T extends HistoryRow>({ title, partyKind, partyName, payments, loading, total, onCreate, children }: {
  title: string;
  partyKind: "Customer" | "Vendor";
  partyName: string;
  payments: T[];
  loading: boolean;
  total: ReactNode;
  onCreate: () => void;
  children: (payments: T[]) => ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Payment date");
  const [direction, setDirection] = useState("Descending");
  const [date, setDate] = useState("All");
  const [method, setMethod] = useState("All");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const range = dateRangeFor(date);
    const from = range.dateFrom ? new Date(range.dateFrom).getTime() : -Infinity;
    const to = range.dateTo ? new Date(range.dateTo).getTime() + 86400000 - 1 : Infinity;
    const rows = payments.filter(row => (!needle || `${partyName} ${row.serial} ${row.notes} ${row.amount} ${row.method}`.toLowerCase().includes(needle)) && (method === "All" || row.method === method) && row.timestamp >= from && row.timestamp <= to);
    return rows.sort((a, b) => {
      const value = sortBy === "Amount" ? a.amount - b.amount : sortBy === "Payment #" ? a.serial.localeCompare(b.serial, undefined, { numeric: true }) : a.timestamp - b.timestamp;
      return direction === "Ascending" ? value : -value;
    });
  }, [payments, search, sortBy, direction, date, method, partyName]);
  const totalPage = Math.max(1, Math.ceil(filtered.length / LIST_PAGE_SIZE));
  const currentPage = Math.min(page, totalPage);
  const optionClass = "w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left";
  const chipClass = "inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap";
  return <ResizableListPanel className="payment-history-sidebar" onCreate={onCreate} createTitle="Record Payment">
    <div className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
      <h2 className="text-base font-semibold text-gray-900 tracking-tight truncate">{title}</h2>
      <button type="button" title="Search payments" aria-label="Search payments" onClick={() => input.current?.focus()} className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
    </div>
    <div className="px-3 py-2 border-b border-gray-300 shrink-0"><div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      <input ref={input} aria-label="Search payments" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search payments..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
    </div></div>
    <div className="list-filter-toolbar hover-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden px-3 py-2 border-b border-gray-300 shrink-0">
      <ListFilterDropdown trigger={<span className={`${chipClass} border-solid`}>Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
        {close => <>{["Payment date", "Payment #", "Amount"].map(value => <button type="button" key={value} className={optionClass} onClick={() => { setSortBy(value); setPage(1); close(); }}>{value}{value === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>)}<div className="border-t border-gray-200 my-1" />{["Ascending", "Descending"].map(value => <button type="button" key={value} className={optionClass} onClick={() => { setDirection(value); setPage(1); close(); }}>{value}{value === direction && <Check className="w-4 h-4 text-blue-600" />}</button>)}</>}
      </ListFilterDropdown>
      <span className={chipClass} title={`Payments for ${partyName}`}><span className="font-medium">{partyKind}</span> | {partyName}</span>
      <ListFilterDropdown align="right" trigger={<span className={chipClass}><Plus className="w-3 h-3" />Payment date | {date}<ChevronDown className="w-3 h-3" /></span>}>
        {close => DATE_FILTER_OPTIONS.map(value => <button type="button" key={value} className={optionClass} onClick={() => { setDate(value); setPage(1); close(); }}>{value}{value === date && <Check className="w-4 h-4 text-blue-600" />}</button>)}
      </ListFilterDropdown>
      <ListFilterDropdown align="right" trigger={<span className={chipClass}><Plus className="w-3 h-3" />Payment Type{method !== "All" ? ` | ${method}` : ""}</span>}>
        {close => ["All", ...new Set(payments.map(row => row.method).filter(value => value !== "All"))].map(value => <button type="button" key={value} className={optionClass} onClick={() => { setMethod(value); setPage(1); close(); }}>{value}{value === method && <Check className="w-4 h-4 text-blue-600" />}</button>)}
      </ListFilterDropdown>
    </div>
    <div className="relative flex-1 min-h-0 overflow-y-auto hover-scrollbar pb-16">
      {children(filtered.slice((currentPage - 1) * LIST_PAGE_SIZE, currentPage * LIST_PAGE_SIZE))}
      {filtered.length === 0 && <div role="status" className="px-4 py-12 text-center text-sm text-gray-500">{loading ? "Loading payments..." : payments.length ? "No payments match these filters." : "No payments recorded yet."}</div>}
    </div>
    <ListSidebarFooter total={total} countLabel={`${filtered.length} ${filtered.length === 1 ? "Payment" : "Payments"}`} pagination={{ totalPage, currentPage, totalData: filtered.length }} page={currentPage} onPageChange={setPage} />
  </ResizableListPanel>;
}
