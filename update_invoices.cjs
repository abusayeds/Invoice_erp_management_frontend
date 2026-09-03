const fs = require('fs');

const path = 'src/pages/sales/SalesInvoice.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `  // live from the shared datastore (customer name resolved by id)
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

const replacement = `  // API Integration: Fetch invoices matching the backend logic filters
  const params: Record<string, any> = {};
  if (statusFilter !== "All") params.status = statusFilter;
  if (search.trim()) params.searchTerm = search;
  // If a single customer is selected, pass it. (queryBuilder usually supports exact match)
  if (customerFilter && customerFilter.length === 1) params.customer_name = customerFilter[0];

  const { data: apiInvoicesRes } = useQuery({
    queryKey: ["invoices", statusFilter, search, customerFilter],
    queryFn: () => api.get<any[]>("/invoice/all", { params }).then(res => (res as any)?.data || res)
  });

  const { data: apiCustomersList = [] } = useQuery({
    queryKey: ["customers_all"],
    queryFn: () => api.get<any[]>("/customer/all").then(res => (res as any)?.data || res)
  });

  // Maintain local fallback for now so the UI doesn't crash during transition
  const dbInvoicesFallback = useCollection<any>("invoices");
  const dbCustomersFallback = useCollection<any>("customers", "name");

  const invoices: Invoice[] = useMemo(() => {
    // If backend returns data, map it
    if (apiInvoicesRes && Array.isArray(apiInvoicesRes)) {
      let mapped = apiInvoicesRes.map(inv => ({
        id: inv._id || inv.id, // backend uses _id
        name: inv.customer_name || apiCustomersList.find((c: any) => c._id === inv.customer_id)?.name || "—",
        number: inv.invoice_number || inv.number,
        note: inv.notes || "No Notes",
        date: inv.date ? new Date(inv.date).toLocaleDateString() : inv.date,
        due: inv.due_date ? new Date(inv.due_date).toLocaleDateString() : inv.due,
        amount: fmtMoney(inv.total),
        status: inv.status,
        _raw: inv
      }));
      // Apply multi-customer filter locally if multiple are selected, since backend might not support ?customer_name=A,B
      if (customerFilter && customerFilter.length > 1) {
        mapped = mapped.filter(i => customerFilter.includes(i.name));
      }
      return mapped;
    }
    
    // Fallback to indexeddb
    return dbInvoicesFallback.slice().sort((a, b) => b.id - a.id).map((inv) => ({
      id: inv.id,
      name: dbCustomersFallback.find((c) => c.id === inv.customerId)?.name || inv.name || "—",
      number: inv.number, note: inv.notes || "No Notes", date: inv.date, due: inv.due,
      amount: fmtMoney(inv.total), status: inv.status,
    }));
  }, [apiInvoicesRes, dbInvoicesFallback, dbCustomersFallback, apiCustomersList, customerFilter]);
`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log("Invoices fetching updated to API!");
