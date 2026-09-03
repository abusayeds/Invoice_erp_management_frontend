/**
 * File: src/pages/doubleEntry/LedgerSummary.tsx
 * Ledger Summary — matches references/double entry/ledger summery.png in the
 * Qayd blue theme. Rows are derived from the persisted journal entries
 * (meta row `de:journal`), flattened one line per account movement.
 */

import React, { useMemo, useState } from "react";
import { money } from "@/lib/db";
import { journalStore, ledgerRows, JOURNAL_REFERENCES } from "@/lib/db/doubleEntry";
import { ListShell } from "../goal/goalShared";
import { ArrowUpDown } from "lucide-react";

type SortField = "date" | "code" | "name";

export const LedgerSummary: React.FC = () => {
  const journal = journalStore.use();

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [refFilter, setRefFilter] = useState("All");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => ledgerRows(journal || []), [journal]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const out = rows.filter(
      (r) =>
        (refFilter === "All" || r.reference === refFilter) &&
        (r.name.toLowerCase().includes(q) ||
          r.code.includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q)),
    );
    if (sortField !== "date") {
      const pick = (r: (typeof out)[number]) => (sortField === "code" ? r.code : r.name);
      out.sort((a, b) => (sortAsc ? pick(a).localeCompare(pick(b)) : pick(b).localeCompare(pick(a))));
    } else if (sortAsc) {
      out.reverse();
    }
    return out;
  }, [rows, search, refFilter, sortField, sortAsc]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortAsc(!sortAsc);
    else {
      setSortField(f);
      setSortAsc(true);
    }
  };
  const SortTh = ({ field, label }: { field: SortField; label: string }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
      <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-gray-900">
        {label} <ArrowUpDown className="w-3 h-3" />
      </button>
    </th>
  );
  const amt = (n: number) => (n ? money(n) : "-");

  return (
    <ListShell
      module="Double Entry"
      current="Ledger Summary"
      title="Ledger Summary"
      search={search}
      setSearch={setSearch}
      searchPlaceholder="Search ledger entries..."
      perPage={perPage}
      setPerPage={setPerPage}
      page={page}
      setPage={setPage}
      total={filtered.length}
      filterOptions={JOURNAL_REFERENCES}
      filterValue={refFilter}
      setFilterValue={setRefFilter}
      filterLabel="Reference"
    >
      <table className="w-full text-sm min-w-[980px]">
        <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
          <tr>
            <SortTh field="date" label="Date" />
            <SortTh field="code" label="Account Code" />
            <SortTh field="name" label="Account Name" />
            {["Reference", "Description", "Debit", "Credit"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {paginated.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3.5 text-gray-600">{r.date}</td>
              <td className="px-4 py-3.5 text-gray-900">{r.code}</td>
              <td className="px-4 py-3.5 font-medium text-gray-900">{r.name}</td>
              <td className="px-4 py-3.5 text-gray-600">{r.reference}</td>
              <td className="px-4 py-3.5 text-gray-600">{r.description}</td>
              <td className="px-4 py-3.5 text-gray-900">{amt(r.debit)}</td>
              <td className="px-4 py-3.5 text-gray-900">{amt(r.credit)}</td>
            </tr>
          ))}
          {paginated.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No ledger entries found.</td></tr>
          )}
        </tbody>
      </table>
    </ListShell>
  );
};
