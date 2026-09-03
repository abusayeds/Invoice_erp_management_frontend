/**
 * File: src/pages/budgetPlanner/BudgetMonitoring.tsx
 * Budget Monitoring — matches references/budget planner/budget monitoring/*
 * in the Qayd blue theme. Read-only report; snapshots persist in meta row
 * `budget:monitoring`.
 */

import React, { useMemo, useState } from "react";
import { money } from "@/lib/db";
import {
  budgetMonitorStore,
} from "@/lib/db/budget";
import { ListShell } from "../goal/goalShared";
import { ArrowUpDown } from "lucide-react";

export const BudgetMonitoring: React.FC = () => {
  const rows = budgetMonitorStore.use();

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [budgetFilter, setBudgetFilter] = useState("All");
  const [sortField, setSortField] = useState<"budget" | "date">("date");
  const [sortAsc, setSortAsc] = useState(false);

  const list = rows || [];
  const budgetNames = useMemo(() => Array.from(new Set(list.map((r) => r.budget))), [list]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const out = list.filter(
      (r) => (budgetFilter === "All" || r.budget === budgetFilter) && r.budget.toLowerCase().includes(q),
    );
    out.sort((a, b) => (sortAsc ? a[sortField].localeCompare(b[sortField]) : b[sortField].localeCompare(a[sortField])));
    return out;
  }, [list, search, budgetFilter, sortField, sortAsc]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (f: "budget" | "date") => {
    if (sortField === f) setSortAsc(!sortAsc);
    else {
      setSortField(f);
      setSortAsc(true);
    }
  };

  return (
    <ListShell
      module="Budget Planner"
      current="Budget Monitoring"
      title="Budget Monitoring"
      search={search}
      setSearch={setSearch}
      searchPlaceholder="Search Budget Monitoring..."
      perPage={perPage}
      setPerPage={setPerPage}
      page={page}
      setPage={setPage}
      total={filtered.length}
      filterOptions={budgetNames}
      filterValue={budgetFilter}
      setFilterValue={setBudgetFilter}
      filterLabel="Budget"
    >
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
              <button onClick={() => toggleSort("budget")} className="flex items-center gap-1 hover:text-gray-900">
                Budget <ArrowUpDown className="w-3 h-3" />
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
              <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-gray-900">
                Date <ArrowUpDown className="w-3 h-3" />
              </button>
            </th>
            {["Allocated", "Spent", "Remaining", "Variance %"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {paginated.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3.5 font-medium text-gray-900">{r.budget}</td>
              <td className="px-4 py-3.5 text-gray-600">{r.date}</td>
              <td className="px-4 py-3.5 text-gray-900">{money(r.allocated)}</td>
              <td className="px-4 py-3.5 text-gray-600">{money(r.spent)}</td>
              <td className="px-4 py-3.5 text-gray-900">{money(r.allocated - r.spent)}</td>
              <td className={`px-4 py-3.5 font-medium ${r.variance < 0 ? "text-red-500" : r.variance > 0 ? "text-green-600" : "text-gray-600"}`}>
                {r.variance.toFixed(2)}%
              </td>
            </tr>
          ))}
          {paginated.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No monitoring entries found.</td></tr>
          )}
        </tbody>
      </table>
    </ListShell>
  );
};
