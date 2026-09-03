const fs = require('fs');

const path = 'src/pages/sales/SalesInvoice.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. We need to import useQuery and api if not already imported
if (!content.includes('import { useQuery }')) {
    content = content.replace('import React, {', 'import { useQuery } from "@tanstack/react-query";\nimport { api } from "@/lib/api/client";\nimport React, {');
}

// 2. We will replace CustomerFilter to use the API dynamically!
const newCustomerFilter = `
const CustomerFilter: React.FC<{
  applied: string[] | null; // null = All Customers
  onApply: (v: string[] | null) => void;
}> = ({ applied, onApply }) => {
  const { data: apiCustomers = [] } = useQuery({
    queryKey: ["customers_all"],
    queryFn: () => api.get<any[]>("/customer/all").then(res => (res as any)?.data || res)
  });
  
  const customerList = apiCustomers.map((c: any) => c.name || c.businessProfile?.companyName).filter(Boolean);

  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(applied === null);
  const [sel, setSel] = useState<Set<string>>(new Set(applied ?? customerList));
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) {
      setAll(applied === null);
      setSel(new Set(applied ?? customerList));
      setQ("");
    }
  }, [open, applied, customerList.length]);

  const toggleAll = () => {
    if (all) {
      setAll(false);
      setSel(new Set());
    } else {
      setAll(true);
      setSel(new Set(customerList));
    }
  };

  const apply = () => {
    onApply(all ? null : Array.from(sel));
    setOpen(false);
  };

  const visible = customerList.filter((c) => c.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"
      >
        <Plus className="w-3 h-3" />
        Customer | {applied === null ? "All" : \`\${applied.length} selected\`}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-xl z-30 py-2">
          <div className="px-3 pb-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                placeholder="Search customers..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
            <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={all} onChange={toggleAll} className="rounded text-blue-600 focus:ring-blue-600" />
              <span className="text-sm text-gray-700">All Customers</span>
            </label>
            {visible.map((c) => (
              <label key={c} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={all || sel.has(c)}
                  onChange={(e) => {
                    const next = new Set(sel);
                    if (e.target.checked) next.add(c);
                    else {
                      next.delete(c);
                      setAll(false);
                    }
                    setSel(next);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-gray-700 truncate" title={c}>{c}</span>
              </label>
            ))}
            {visible.length === 0 && <div className="px-3 py-2 text-sm text-gray-500 text-center">No matches found</div>}
          </div>
          <div className="px-3 pt-2 border-t border-gray-200 flex justify-end">
            <button onClick={apply} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
};
`;

const filterStart = content.indexOf('const CustomerFilter: React.FC');
const filterEnd = content.indexOf('const CreateInvoiceModal: React.FC'); // It's just before CreateInvoiceModal

if (filterStart !== -1 && filterEnd !== -1) {
    content = content.substring(0, filterStart) + newCustomerFilter + "\n/* ── Create Invoice modal (live customer + item pickers → persists) ── */\n" + content.substring(filterEnd);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Customer filter updated!");
} else {
    console.log("Could not find bounds");
}
