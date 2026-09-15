/**
 * Navbar global search dropdown — live results + module filters.
 * Click input → module picker opens (default All); type → live results.
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Check,
  Loader2,
  Users,
  FileText,
  Receipt,
  FileSpreadsheet,
  Truck,
  CreditCard,
  DollarSign,
  Building2,
  ShoppingCart,
  Package,
  Wrench,
  Clock,
  FolderOpen,
  BarChart3,
  UserCog,
  CircleDollarSign,
} from "lucide-react";
import {
  GLOBAL_SEARCH_MODULES,
  runGlobalSearch,
  type GlobalSearchHit,
  type GlobalSearchModule,
} from "@/services/globalSearchApi";

const MODULE_ICON: Record<Exclude<GlobalSearchModule, "All">, React.ElementType> = {
  Customers: Users,
  Invoices: FileText,
  "Proforma Invoices": FileSpreadsheet,
  "Sales Receipts": Receipt,
  Estimates: FileSpreadsheet,
  "Delivery Challans": Truck,
  "Credit Notes": CreditCard,
  "Payment Received": DollarSign,
  Vendors: Building2,
  "Purchase Orders": ShoppingCart,
  Bills: FileText,
  Expenses: Receipt,
  "Payment Made": CircleDollarSign,
  "Debit Notes": CreditCard,
  Products: Package,
  Services: Wrench,
  "Time Logs": Clock,
  Projects: FolderOpen,
  Reports: BarChart3,
  Team: UserCog,
  Companies: Building2,
};

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState<GlobalSearchModule>("All");
  const [rightFilter, setRightFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const [rightMenuOpen, setRightMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setModuleMenuOpen(false);
        setRightMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const rows = await runGlobalSearch({
          query: q,
          module,
          limit: Math.max(visibleCount, 20),
        });
        if (!cancelled) setHits(rows);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, module, visibleCount]);

  const reset = () => {
    setQuery("");
    setHits([]);
    setOpen(false);
    setModuleMenuOpen(false);
    setRightMenuOpen(false);
    setVisibleCount(12);
    setModule("All");
    setRightFilter("All");
  };

  const openPanel = () => {
    setOpen(true);
    setModuleMenuOpen(true);
    setRightMenuOpen(false);
  };

  const go = (hit: GlobalSearchHit) => {
    setOpen(false);
    setModuleMenuOpen(false);
    setQuery("");
    if (hit.selectedId) {
      navigate(hit.path, { state: { selectedId: hit.selectedId } });
    } else {
      navigate(hit.path);
    }
  };

  const shown = hits.slice(0, visibleCount);
  const hasQuery = query.trim().length > 0;

  return (
    <div className="relative flex-1 min-w-0" ref={rootRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none z-10" />
      <input
        type="text"
        placeholder="Search contact, invoice, estimate..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setModuleMenuOpen(false);
          setVisibleCount(12);
        }}
        onFocus={openPanel}
        onClick={openPanel}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setModuleMenuOpen(false);
            return;
          }
          if (e.key === "Enter" && shown[0]) go(shown[0]);
        }}
        className="keep-box ua-field w-full pl-9 pr-16 py-2.5 text-sm border border-gray-200 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-600 rounded-md"
      />
      {query.trim() && (
        <button
          type="button"
          onClick={reset}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
          title="Reset"
        >
          Reset
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.4rem)] w-[min(92vw,480px)] max-h-[min(78vh,520px)] flex flex-col bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setModuleMenuOpen((o) => !o);
                  setRightMenuOpen(false);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 bg-white max-w-[180px]"
              >
                <span className="truncate">{module}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              </button>
              {moduleMenuOpen && (
                <div className="absolute left-0 z-[60] mt-1 min-w-[200px] max-h-64 overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded-md shadow-xl py-1">
                  {GLOBAL_SEARCH_MODULES.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setModule(opt);
                        setModuleMenuOpen(false);
                        setVisibleCount(12);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                    >
                      <span className="truncate">{opt}</span>
                      {opt === module && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setRightMenuOpen((o) => !o);
                  setModuleMenuOpen(false);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 bg-white max-w-[120px]"
              >
                <span className="truncate">{rightFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              </button>
              {rightMenuOpen && (
                <div className="absolute right-0 z-[60] mt-1 min-w-[120px] overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded-md shadow-xl py-1">
                  {["All"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setRightFilter(opt);
                        setRightMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                    >
                      <span>{opt}</span>
                      {opt === rightFilter && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[120px]">
            {!hasQuery ? (
              <div className="px-4 py-8 text-sm text-gray-500 text-center">
                Select a module (default <span className="font-medium text-gray-700">All</span>), then type to search.
              </div>
            ) : loading && hits.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching…
              </div>
            ) : shown.length === 0 ? (
              <div className="px-4 py-10 text-sm text-gray-500 text-center">Search result not found.</div>
            ) : (
              <ul>
                {shown.map((hit) => {
                  const Icon = MODULE_ICON[hit.module] || FileText;
                  return (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => go(hit)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <span className="w-9 h-9 flex-shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-900 truncate">
                            <span className="font-medium">{hit.module}</span>
                            <span className="text-gray-400"> • </span>
                            <span>{hit.title}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{hit.number}</span>
                            {hit.date !== "—" && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="whitespace-nowrap">{hit.date}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {hit.amount !== "—" && (
                          <span className="text-sm font-medium text-gray-900 whitespace-nowrap flex-shrink-0">
                            {hit.amount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hasQuery && shown.length > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + 12)}
              className="w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-200 text-center font-medium"
            >
              Show more results...
            </button>
          )}
        </div>
      )}
    </div>
  );
};
