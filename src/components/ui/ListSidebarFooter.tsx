/**
 * Shared list-sidebar footer: total (distinct color) + count + backend prev/next arrows.
 * Arrows render only when previous/next pages exist.
 */
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TPartyPagination } from "@/services/customerTypes";

export const LIST_PAGE_SIZE = 20;

export type ListSidebarFooterProps = {
  /** Amount / summary line (e.g. "$1,200.00 Due") — uses a distinct color from the old gray footer. */
  total: React.ReactNode;
  /** Count line (e.g. "12 Invoices") */
  countLabel: string;
  pagination?: Pick<TPartyPagination, "totalPage" | "currentPage" | "totalData"> | null;
  page?: number;
  onPageChange?: (page: number) => void;
};

export function ListSidebarFooter({
  total,
  countLabel,
  pagination,
  page,
  onPageChange,
}: ListSidebarFooterProps) {
  const current = page ?? pagination?.currentPage ?? 1;
  const totalPage = Math.max(1, pagination?.totalPage ?? 1);
  const showPrev = !!onPageChange && current > 1;
  const showNext = !!onPageChange && current < totalPage;
  const showPager = showPrev || showNext;

  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-100">
      <div className="text-sm font-semibold text-center text-sky-700">{total}</div>
      <div className="mt-0.5 text-xs text-center text-slate-500">{countLabel}</div>
      {showPager && (
        <div className="mt-2 flex items-center justify-between">
          {showPrev ? (
            <button
              type="button"
              title="Previous page"
              aria-label="Previous page"
              onClick={() => onPageChange!(current - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:bg-white hover:text-sky-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <span className="w-8 h-8" aria-hidden />
          )}
          {showNext ? (
            <button
              type="button"
              title="Next page"
              aria-label="Next page"
              onClick={() => onPageChange!(current + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:bg-white hover:text-sky-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="w-8 h-8" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}

export default ListSidebarFooter;
