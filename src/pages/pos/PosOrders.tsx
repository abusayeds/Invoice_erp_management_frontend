/**
 * File: src/pages/pos/PosOrders.tsx
 * POS Orders — matches references/pos/pos order.png in the Qayd blue theme:
 * searchable, sortable, paginated list of completed POS sales (Sale Number /
 * Customer / Warehouse / Total / eye action). Orders persist in `pos:orders`.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { money } from "@/lib/db";
import { posOrderStore, SEED_POS_ORDERS, orderTotal, warehouseShort, POS_WAREHOUSES } from "@/lib/db/pos";
import { ListShell } from "../goal/goalShared";
import { ArrowUpDown, Eye } from "lucide-react";

export const PosOrders: React.FC = () => {
  const navigate = useNavigate();
  const orders = posOrderStore.use();
  useEffect(() => {
    if (orders === null) posOrderStore.save(SEED_POS_ORDERS);
  }, [orders]);

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [warehouseFilter, setWarehouseFilter] = useState("All");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const out = (orders || []).filter(
      (o) =>
        (warehouseFilter === "All" || warehouseShort(o.warehouse) === warehouseFilter) &&
        (o.number.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          o.warehouse.toLowerCase().includes(q)),
    );
    out.sort((a, b) => (sortAsc ? a.number.localeCompare(b.number) : b.number.localeCompare(a.number)));
    return out;
  }, [orders, search, warehouseFilter, sortAsc]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <ListShell
      module="POS"
      current="POS Orders"
      title="POS Orders"
      search={search}
      setSearch={setSearch}
      searchPlaceholder="Search by order number, customer, warehouse..."
      perPage={perPage}
      setPerPage={setPerPage}
      page={page}
      setPage={setPage}
      total={filtered.length}
      filterOptions={POS_WAREHOUSES.map(warehouseShort)}
      filterValue={warehouseFilter}
      setFilterValue={setWarehouseFilter}
      filterLabel="Warehouse"
    >
      <table className="w-full text-sm min-w-[820px]">
        <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
              <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-1 hover:text-gray-900">
                Sale Number <ArrowUpDown className="w-3 h-3" />
              </button>
            </th>
            {["Customer", "Warehouse", "Total", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {paginated.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50">
              <td className="px-4 py-3.5">
                <button onClick={() => navigate(`/pos/orders/${o.id}`)} className="text-blue-600 font-medium hover:underline">
                  {o.number}
                </button>
              </td>
              <td className="px-4 py-3.5 text-gray-900">{o.customer}</td>
              <td className="px-4 py-3.5 text-gray-600">{warehouseShort(o.warehouse)}</td>
              <td className="px-4 py-3.5 font-medium text-gray-900">{money(orderTotal(o))}</td>
              <td className="px-4 py-3.5">
                <button
                  onClick={() => navigate(`/pos/orders/${o.id}`)}
                  title={`View ${o.number}`}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {paginated.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No POS orders found.</td></tr>
          )}
        </tbody>
      </table>
    </ListShell>
  );
};
