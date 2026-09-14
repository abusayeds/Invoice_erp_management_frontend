/**
 * Main Reports hub APIs — /account/reports/* (+ list types).
 * Double-entry P&L / cash flow / balance sheet reuse existing doubleEntry helpers.
 * Business Overview reports live in businessOverviewApi.
 */
import { api } from "@/lib/api/client";
import { doubleEntryReports, balanceSheetActions } from "@/services/doubleEntry";
import { fetchProducts } from "@/services/productsApi";
import { fetchServices } from "@/services/servicesApi";
import {
  loadOperationalProfitLoss,
  loadProfitByProductReport,
  loadQuartersReport,
  loadSummaryReport,
} from "@/services/businessOverviewApi";
import type { ReportCol, ReportFilters, ReportView } from "@/services/reportTypes";

export type { ReportCol, ReportFilters, ReportView } from "@/services/reportTypes";

const money = (n: number) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;
const yearEnd = () => `${new Date().getFullYear()}-12-31`;

const unavailable = (name: string, reason: string): ReportView => ({
  name,
  cols: [{ label: "Status" }],
  rows: [[reason]],
  totals: ["—"],
  source: "unavailable",
  message: reason,
});

const fromListPayload = (name: string, data: any, moneyKeys: string[] = ["total", "amount"]): ReportView => {
  const columns: Array<{ id: string; label: string }> = Array.isArray(data?.columns) ? data.columns : [];
  const rowsRaw: Record<string, unknown>[] = Array.isArray(data?.rows) ? data.rows : [];
  const cols: ReportCol[] = columns.map((c) => ({
    label: c.label,
    key: c.id,
    right: moneyKeys.includes(c.id),
  }));
  const rows = rowsRaw.map((r) =>
    columns.map((c) => {
      const v = r[c.id];
      if (moneyKeys.includes(c.id)) return money(Number(v) || 0);
      return v == null || v === "" ? "—" : String(v);
    }),
  );
  const totals = cols.map((c, i) => {
    if (i === 0) return `Total (${rows.length})`;
    if (!c.right) return "";
    const sum = rowsRaw.reduce((s, r) => s + (Number(r[c.key || ""]) || 0), 0);
    return money(sum);
  });
  return {
    name: data?.title || name,
    cols: cols.length ? cols : [{ label: "—" }],
    rows,
    totals: totals.length ? totals : [`Total (${rows.length})`],
    source: "backend",
  };
};

async function fetchAccountList(type: string) {
  const res = await api.raw.get("/account/reports/list", { params: { type } });
  return res.data?.data ?? res.data;
}

async function fetchInvoiceAging(asOfDate: string) {
  const res = await api.raw.get("/account/reports/invoice-aging", { params: { as_of_date: asOfDate } });
  return res.data?.data ?? res.data;
}

async function fetchBillAging(asOfDate: string) {
  const res = await api.raw.get("/account/reports/bill-aging", { params: { as_of_date: asOfDate } });
  return res.data?.data ?? res.data;
}

async function fetchTaxSummary(fromDate: string, toDate: string) {
  const res = await api.raw.get("/account/reports/tax-summary", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return res.data?.data ?? res.data;
}

async function fetchCustomerBalance(asOfDate: string, showZero: boolean) {
  const res = await api.raw.get("/account/reports/customer-balance", {
    params: { as_of_date: asOfDate, show_zero_balances: showZero ? "true" : "false" },
  });
  return res.data?.data ?? res.data;
}

async function fetchVendorBalance(asOfDate: string, showZero: boolean) {
  const res = await api.raw.get("/account/reports/vendor-balance", {
    params: { as_of_date: asOfDate, show_zero_balances: showZero ? "true" : "false" },
  });
  return res.data?.data ?? res.data;
}

const mapAgingCustomers = (name: string, data: any, partyKey: "customer_name" | "vendor_name"): ReportView => {
  const parties: any[] = Array.isArray(data?.customers)
    ? data.customers
    : Array.isArray(data?.vendors)
      ? data.vendors
      : [];
  const cols: ReportCol[] = [
    { label: "Name" },
    { label: "Current", right: true },
    { label: "1-30 Days", right: true },
    { label: "31-60 Days", right: true },
    { label: "61-90 Days", right: true },
    { label: ">90 Days", right: true },
    { label: "Total Outstanding", right: true },
  ];
  const sums = [0, 0, 0, 0, 0, 0];
  const rows = parties.map((p) => {
    const vals = [
      Number(p.current) || 0,
      Number(p["1_30_days"]) || 0,
      Number(p["31_60_days"]) || 0,
      Number(p["61_90_days"]) || 0,
      Number(p.over_90_days) || 0,
      Number(p.total) || 0,
    ];
    vals.forEach((n, i) => (sums[i] += n));
    return [String(p[partyKey] || "—"), ...vals.map(money)];
  });
  return {
    name,
    cols,
    rows,
    totals: [`Total (${rows.length})`, ...sums.map(money)],
    meta: { asOf: data?.as_of_date },
    source: "backend",
  };
};

/** Map sidebar report title → backend fetch + normalized grid. */
export async function loadReportView(reportName: string, filters: ReportFilters = {}): Promise<ReportView> {
  const asOf = filters.asOfDate || today();
  const from = filters.fromDate || yearStart();
  const to = filters.toDate || yearEnd();
  const showZero = !!filters.showZero;

  switch (reportName) {
    case "Summary Report":
      return loadSummaryReport({ ...filters, asOfDate: asOf, showZero });

    case "Quarters Report":
      return loadQuartersReport({ ...filters, asOfDate: asOf, showZero });

    case "Profit by Product Report":
      return loadProfitByProductReport({ ...filters, asOfDate: asOf, showZero });

    case "Invoice Aging Report":
      return mapAgingCustomers(reportName, await fetchInvoiceAging(asOf), "customer_name");

    case "Bill Aging Report":
      return mapAgingCustomers(reportName, await fetchBillAging(asOf), "vendor_name");

    case "Tax Summary Report": {
      const data = await fetchTaxSummary(from, to);
      const collected = Array.isArray(data?.tax_collected?.items) ? data.tax_collected.items : [];
      const paid = Array.isArray(data?.tax_paid?.items) ? data.tax_paid.items : [];
      const rows = [
        ...collected.map((i: any) => ["Collected", String(i.tax_name || "—"), money(Number(i.amount) || 0)]),
        ...paid.map((i: any) => ["Paid", String(i.tax_name || "—"), money(Number(i.amount) || 0)]),
        ["Net liability", "—", money(Number(data?.net_tax_liability) || 0)],
      ];
      return {
        name: reportName,
        cols: [{ label: "Type" }, { label: "Tax" }, { label: "Amount", right: true }],
        rows,
        totals: ["", "", money(Number(data?.net_tax_liability) || 0)],
        meta: { from: data?.from_date || from, to: data?.to_date || to },
        source: "backend",
      };
    }

    case "Sales Report":
      return fromListPayload(reportName, await fetchAccountList("sales"));
    case "Estimate Report":
      return fromListPayload(reportName, await fetchAccountList("estimate"));
    case "Payment Report":
      return fromListPayload(reportName, await fetchAccountList("payment"), ["amount"]);
    case "Purchase Report":
      return fromListPayload(reportName, await fetchAccountList("purchase_order"));
    case "Expense Report":
      return fromListPayload(reportName, await fetchAccountList("expense"));
    case "Stock Report":
      return fromListPayload(reportName, await fetchAccountList("stock"), ["quantity", "buy_price", "sell_price"]);

    case "Sales by Customer Report": {
      const data = await fetchCustomerBalance(asOf, showZero);
      const list: any[] = Array.isArray(data?.customers) ? data.customers : Array.isArray(data) ? data : [];
      const cols: ReportCol[] = [
        { label: "Customer" },
        { label: "Invoiced", right: true },
        { label: "Paid", right: true },
        { label: "Balance", right: true },
      ];
      let inv = 0, paid = 0, bal = 0;
      const rows = list.map((c) => {
        const a = Number(c.total_invoiced ?? c.net_invoiced) || 0;
        const b = Number(c.total_paid) || 0;
        const d = Number(c.balance) || 0;
        inv += a; paid += b; bal += d;
        return [String(c.customer_name || "—"), money(a), money(b), money(d)];
      });
      return {
        name: reportName,
        cols,
        rows,
        totals: [`Total (${rows.length})`, money(inv), money(paid), money(bal)],
        meta: { asOf },
        source: "backend",
      };
    }

    case "Purchase by Vendor Report": {
      const data = await fetchVendorBalance(asOf, showZero);
      const list: any[] = Array.isArray(data?.vendors) ? data.vendors : Array.isArray(data) ? data : [];
      const cols: ReportCol[] = [
        { label: "Vendor" },
        { label: "Billed", right: true },
        { label: "Paid", right: true },
        { label: "Balance", right: true },
      ];
      let billed = 0, paid = 0, bal = 0;
      const rows = list.map((v) => {
        const a = Number(v.total_billed ?? v.total_invoiced) || 0;
        const b = Number(v.total_paid) || 0;
        const d = Number(v.balance) || 0;
        billed += a; paid += b; bal += d;
        return [String(v.vendor_name || "—"), money(a), money(b), money(d)];
      });
      return {
        name: reportName,
        cols,
        rows,
        totals: [`Total (${rows.length})`, money(billed), money(paid), money(bal)],
        meta: { asOf },
        source: "backend",
      };
    }

    case "Product Report": {
      const { rows: products } = await fetchProducts({ page: 1, limit: 500 });
      const cols: ReportCol[] = [
        { label: "Product" },
        { label: "SKU" },
        { label: "Category" },
        { label: "Stock", right: true },
        { label: "Sell Price", right: true },
      ];
      const rows = products.map((p) => [
        p.name,
        p.sku,
        p.category,
        p.stock == null ? "—" : String(p.stock),
        money(p.price),
      ]);
      return {
        name: reportName,
        cols,
        rows,
        totals: [`Total (${rows.length})`, "", "", "", ""],
        source: "backend",
      };
    }

    case "Service Report": {
      const { rows: services } = await fetchServices({ page: 1, limit: 500 });
      const cols: ReportCol[] = [
        { label: "Service" },
        { label: "Unit" },
        { label: "Rate", right: true },
      ];
      let sum = 0;
      const rows = services.map((s) => {
        sum += s.price;
        return [s.name, s.unit, money(s.price)];
      });
      return {
        name: reportName,
        cols,
        rows,
        totals: [`Total (${rows.length})`, "", money(sum)],
        source: "backend",
      };
    }

    case "Profit & Loss":
      return loadOperationalProfitLoss({ ...filters, asOfDate: asOf, showZero });

    case "Double Entry Profit & Loss": {
      const data: any = await doubleEntryReports.profitLoss({ from_date: from, to_date: to });
      const revenue = Array.isArray(data?.revenue) ? data.revenue : [];
      const expenses = Array.isArray(data?.expenses) ? data.expenses : [];
      const cols: ReportCol[] = [
        { label: "Section" },
        { label: "Account" },
        { label: "Code" },
        { label: "Balance", right: true },
      ];
      const rows = [
        ...revenue.map((r: any) => ["Revenue", String(r.account_name || "—"), String(r.account_code || "—"), money(Number(r.balance) || 0)]),
        ...expenses.map((r: any) => ["Expense", String(r.account_name || "—"), String(r.account_code || "—"), money(Number(r.balance) || 0)]),
        ["Net profit", "—", "—", money(Number(data?.net_profit) || 0)],
      ];
      return {
        name: reportName,
        cols,
        rows,
        totals: ["", "", "", money(Number(data?.net_profit) || 0)],
        meta: { from: data?.from_date || from, to: data?.to_date || to },
        source: "backend",
      };
    }

    case "Cash Flow": {
      const data: any = await doubleEntryReports.cashFlow({ from_date: from, to_date: to });
      // Flexible render: flatten scalar + nested totals
      const cols: ReportCol[] = [{ label: "Item" }, { label: "Amount", right: true }];
      const rows: string[][] = [];
      const pushObj = (prefix: string, obj: any) => {
        if (!obj || typeof obj !== "object") return;
        Object.entries(obj).forEach(([k, v]) => {
          if (typeof v === "number") rows.push([`${prefix}${k.replace(/_/g, " ")}`, money(v)]);
          else if (v && typeof v === "object" && !Array.isArray(v)) pushObj(`${prefix}${k} › `, v);
        });
      };
      pushObj("", data);
      if (rows.length === 0) {
        rows.push(["No cash-flow lines", money(0)]);
      }
      return {
        name: reportName,
        cols,
        rows,
        totals: [`Total (${rows.length})`, ""],
        meta: { from, to },
        source: "backend",
      };
    }

    case "Balance Sheet": {
      const data: any = await balanceSheetActions.latest();
      if (!data) {
        return unavailable(reportName, "No balance sheet found. Generate one under Double Entry → Balance Sheets.");
      }
      const cols: ReportCol[] = [
        { label: "Field" },
        { label: "Value", right: true },
      ];
      const rows = [
        ["Date", String(data.balance_sheet_date || "—").slice(0, 10)],
        ["Financial year", String(data.financial_year || "—")],
        ["Status", String(data.status || "—")],
        ["Total assets", money(Number(data.total_assets) || 0)],
        ["Total liabilities", money(Number(data.total_liabilities) || 0)],
        ["Total equity", money(Number(data.total_equity) || 0)],
      ];
      return {
        name: reportName,
        cols,
        rows,
        totals: ["", ""],
        meta: { asOf: String(data.balance_sheet_date || "").slice(0, 10) },
        source: "backend",
      };
    }

    case "Sales by User Report":
    case "Sales Report by Product":
    case "Sales Report by Service":
    case "Sales by Category Report":
    case "Project Report":
    case "Time Log Report":
      return unavailable(
        reportName,
        "No dedicated backend report endpoint for this view yet. Do not use local/fake data.",
      );

    default:
      return unavailable(reportName, "Report not mapped to a backend endpoint.");
  }
}

export function reportFilterKind(reportName: string): "as_of" | "range" | "none" {
  if (
    reportName === "Invoice Aging Report" ||
    reportName === "Bill Aging Report" ||
    reportName === "Sales by Customer Report" ||
    reportName === "Purchase by Vendor Report" ||
    reportName === "Balance Sheet"
  ) {
    return "as_of";
  }
  if (
    reportName === "Tax Summary Report" ||
    reportName === "Profit & Loss" ||
    reportName === "Double Entry Profit & Loss" ||
    reportName === "Cash Flow" ||
    reportName === "Summary Report" ||
    reportName === "Quarters Report" ||
    reportName === "Profit by Product Report"
  ) {
    return "range";
  }
  return "none";
}

export { today, yearStart, yearEnd };
