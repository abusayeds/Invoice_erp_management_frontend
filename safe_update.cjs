const fs = require('fs');
const path = 'src/pages/sales/SalesInvoice.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { useQuery }')) {
    content = content.replace('import React, {', 'import { useQuery } from "@tanstack/react-query";\nimport { api } from "@/lib/api/client";\nimport React, {');
}

// 1. Update the invoices mapping logic
const targetInvoices = `  // live from the shared datastore (customer name resolved by id)
  const dbInvoices = useCollection<any>("invoices");
  const dbCustomers = useCollection<any>("customers", "name");
  const invoices: Invoice[] = useMemo(
    () => dbInvoices.slice().sort((a, b) => b.id - a.id).map((inv) => ({
      id: inv.id,
      name: dbCustomers.find((c) => c.id === inv.customerId)?.name || inv.name || "—",
      number: inv.number, note: inv.notes || "No Notes", date: inv.date, due: inv.due,
      amount: fmtMoney(inv.total), status: inv.status,
    })),
    [dbInvoices, dbCustomers],
  );`;

const replacementInvoices = `  // API Integration: Fetch invoices matching the backend logic filters
  const params: Record<string, any> = {};
  if (statusFilter !== "All") params.status = statusFilter;
  if (search.trim()) params.searchTerm = search;
  if (customerFilter && customerFilter.length === 1) params.customer_name = customerFilter[0];

  const { data: apiInvoicesRes } = useQuery({
    queryKey: ["invoices", statusFilter, search, customerFilter],
    queryFn: () => api.get<any[]>("/invoice/all", { params }).then(res => (res as any)?.data || res)
  });

  const { data: apiCustomersList = [] } = useQuery({
    queryKey: ["customers_all"],
    queryFn: () => api.get<any[]>("/customer/all").then(res => (res as any)?.data || res)
  });

  const dbInvoices = useCollection<any>("invoices");
  const dbCustomers = useCollection<any>("customers", "name");

  const invoices: Invoice[] = useMemo(() => {
    if (apiInvoicesRes && Array.isArray(apiInvoicesRes)) {
      let mapped = apiInvoicesRes.map(inv => ({
        id: inv._id || inv.id,
        name: inv.customer_name || apiCustomersList.find((c: any) => c._id === inv.customer_id)?.name || "—",
        number: inv.invoice_number || inv.number,
        note: inv.notes || "No Notes",
        date: inv.date ? new Date(inv.date).toLocaleDateString() : inv.date,
        due: inv.due_date ? new Date(inv.due_date).toLocaleDateString() : inv.due,
        amount: fmtMoney(inv.total),
        status: inv.status,
        _raw: inv
      }));
      if (customerFilter && customerFilter.length > 1) {
        mapped = mapped.filter(i => customerFilter.includes(i.name));
      }
      return mapped;
    }
    
    return dbInvoices.slice().sort((a, b) => b.id - a.id).map((inv) => ({
      id: inv.id,
      name: dbCustomers.find((c) => c.id === inv.customerId)?.name || inv.name || "—",
      number: inv.number, note: inv.notes || "No Notes", date: inv.date, due: inv.due,
      amount: fmtMoney(inv.total), status: inv.status,
    }));
  }, [apiInvoicesRes, dbInvoices, dbCustomers, apiCustomersList, customerFilter]);`;

content = content.replace(targetInvoices, replacementInvoices);

// 2. Update CustomerFilter
const targetFilter = `const CustomerFilter: React.FC<{
  applied: string[] | null; // null = All Customers
  onApply: (v: string[] | null) => void;
}> = ({ applied, onApply }) => {
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

  // sync staged state from applied whenever the menu opens
  useEffect(() => {
    if (open) {
      setAll(applied === null);
      setSel(new Set(applied ?? customerList));
      setQ("");
    }
  }, [open, applied]);

  const toggleAll = () => {
    if (all) {
      setAll(false);
      setSel(new Set());
    } else {
      setAll(true);
      setSel(new Set(customerList));
    }
  };`;

const replacementFilter = `const CustomerFilter: React.FC<{
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
  };`;

content = content.replace(targetFilter, replacementFilter);

// Also need to update the visible filter inside CustomerFilter
const targetVisible = `const visible = customerList.filter((c) => c.toLowerCase().includes(q.toLowerCase()));`;
// It is already using customerList which is now dynamic, so it should work out of the box.

fs.writeFileSync(path, content, 'utf8');
console.log("Safely updated SalesInvoice!");
