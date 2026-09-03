/**
 * File: src/pages/AccountDashboard.tsx
 * Complete Account Dashboard with all stats, charts, and visualizations
 * Based on provided screenshot design
 */

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api/client";
import { toObject } from "@/services/_http";
import {
  Users,
  Building2,
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  MoreVertical,
  Eye,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Types for chart data
interface MonthlyPayment {
  month: string;
  amount: number;
}

interface ChartDataItem {
  month: string;
  customerPayments: number;
  vendorPayments: number;
}

// Monthly customer payments data
const monthlyCustomerPaymentsSeed: MonthlyPayment[] = [
  { month: "Dec", amount: 12500 },
  { month: "Jan", amount: 14200 },
  { month: "Feb", amount: 13800 },
  { month: "Mar", amount: 15600 },
  { month: "Apr", amount: 16200 },
  { month: "May", amount: 16862.38 },
];

// Monthly vendor payments data
const monthlyVendorPaymentsSeed: MonthlyPayment[] = [
  { month: "Dec", amount: 11200 },
  { month: "Jan", amount: 12800 },
  { month: "Feb", amount: 13500 },
  { month: "Mar", amount: 14200 },
  { month: "Apr", amount: 15100 },
  { month: "May", amount: 15858.4 },
];

// Combined chart data
const chartDataSeed: ChartDataItem[] = monthlyCustomerPaymentsSeed.map(
  (item, index) => ({
    month: item.month,
    customerPayments: item.amount,
    vendorPayments: monthlyVendorPaymentsSeed[index].amount,
  }),
);

// Types for recent transactions
interface Transaction {
  id: string;
  amount: number;
  description: string;
  fee: number;
  date: string;
  status: "completed" | "pending";
}

// Recent revenue data
const recentRevenueSeed: Transaction[] = [
  {
    id: "REV-2026-02-015",
    amount: 4100.0,
    description:
      "Fiskal Q2 interest earnings and dividend adjustments for tax filings.",
    fee: 310.0,
    date: "2026-02-15",
    status: "completed",
  },
  {
    id: "REV-2026-02-014",
    amount: 8500.0,
    description:
      "Monthly SaaS MRR for June. High retention rate across enterprise clients.",
    fee: 175.0,
    date: "2026-02-14",
    status: "completed",
  },
  {
    id: "REV-2026-02-013",
    amount: 11000.0,
    description:
      "Final sign-off payment for national retail automation implementation.",
    fee: 420.0,
    date: "2026-02-13",
    status: "pending",
  },
];

// Recent expenses data
const recentExpensesSeed: Transaction[] = [
  {
    id: "EXP-2026-02-014",
    amount: 4100.0,
    description:
      "Bulk purchase of recycled paper, toner cartridges, and ergonomic desk accessories.",
    fee: 310.0,
    date: "2026-02-14",
    status: "completed",
  },
  {
    id: "EXP-2026-02-013",
    amount: 8500.0,
    description:
      "Accrued interest on corporate equipment loan for period ending June 30 at 4.5% APR.",
    fee: 175.0,
    date: "2026-02-13",
    status: "completed",
  },
  {
    id: "EXP-2026-02-012",
    amount: 11000.0,
    description:
      "Local transportation and client hospitality for June vendor appreciation dinner.",
    fee: 420.0,
    date: "2026-02-12",
    status: "pending",
  },
];

// Summary stats type
interface SummaryStat {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: "blue" | "purple" | "green" | "orange";
  change: string;
  trend: "up" | "down";
}

// Summary stats
const summaryStatsSeed: SummaryStat[] = [
  {
    title: "Total Clients",
    value: "15",
    subtitle: "Active clients",
    icon: Users,
    color: "blue",
    change: "+12%",
    trend: "up",
  },
  {
    title: "Total Vendors",
    value: "15",
    subtitle: "Active vendors",
    icon: Building2,
    color: "purple",
    change: "+8%",
    trend: "up",
  },
  {
    title: "Total Customer Payment",
    value: "16,862.38$",
    subtitle: "Received payments",
    icon: DollarSign,
    color: "green",
    change: "+23%",
    trend: "up",
  },
  {
    title: "Total Vendor Payment",
    value: "15,858.40$",
    subtitle: "Paid to vendors",
    icon: CreditCard,
    color: "orange",
    change: "-5%",
    trend: "down",
  },
];

// Value formatter for YAxis
const yAxisTickFormatter = (value: number): string => {
  return `$${value / 1000}k`;
};

// Tooltip formatter for customer payments
const customerTooltipFormatter = (
  value: number | string | undefined,
): [string, string] => {
  const numValue = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return [`$${numValue.toLocaleString()}`, "Amount"];
};

// Tooltip formatter for vendor payments
const vendorTooltipFormatter = (
  value: number | string | undefined,
): [string, string] => {
  const numValue = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return [`$${numValue.toLocaleString()}`, "Amount"];
};

// Combined chart tooltip formatter
const combinedTooltipFormatter = (
  value: number | string | undefined,
): [string, string] => {
  const numValue = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return [`$${numValue.toLocaleString()}`, ""];
};

export const AccountDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({
    total_clients: 0,
    total_vendors: 0,
    total_customer_payment: 0,
    total_vendor_payment: 0,
    net_profit: 0,
  });
  const [monthlyCustomerPayments, setMonthlyCustomerPayments] = useState(monthlyCustomerPaymentsSeed);
  const [monthlyVendorPayments, setMonthlyVendorPayments] = useState(monthlyVendorPaymentsSeed);
  const [recentRevenue, setRecentRevenue] = useState<Transaction[]>(recentRevenueSeed);
  const [recentExpenses, setRecentExpenses] = useState<Transaction[]>(recentExpensesSeed);
  const [summaryStats, setSummaryStats] = useState(summaryStatsSeed);
  const chartData = useMemo(
    () =>
      monthlyCustomerPayments.map((item, index) => ({
        month: item.month,
        customerPayments: item.amount,
        vendorPayments: monthlyVendorPayments[index]?.amount ?? 0,
      })),
    [monthlyCustomerPayments, monthlyVendorPayments],
  );

  useEffect(() => {
    let alive = true;
    const money = (v: unknown) =>
      `${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$`;
    const mapTxn = (r: any): Transaction => ({
      id: r.title || String(r._id),
      amount: Number(r.amount) || 0,
      description: r.description || "",
      fee: 0,
      date: r.date ? String(r.date).slice(0, 10) : "",
      status: "completed",
    });
    api
      .get("/account/dashboard")
      .then((res: any) => {
        if (!alive) return;
        const d = toObject<any>(res?.data ?? res) || {};
        const s = d.stats || {};
        if (d.stats) setStats(s);
        if (d.monthlyCustomerPayments?.length)
          setMonthlyCustomerPayments(
            d.monthlyCustomerPayments.map((m: any) => ({ month: m.month, amount: Number(m.customer_payments) || 0 })),
          );
        if (d.monthlyVendorPayments?.length)
          setMonthlyVendorPayments(
            d.monthlyVendorPayments.map((m: any) => ({ month: m.month, amount: Number(m.vendor_payments) || 0 })),
          );
        if (d.recentRevenues?.length) setRecentRevenue(d.recentRevenues.map(mapTxn));
        if (d.recentExpenses?.length) setRecentExpenses(d.recentExpenses.map(mapTxn));
        if (Object.keys(s).length)
          setSummaryStats((prev) =>
            prev.map((c, i) => ({
              ...c,
              value:
                [
                  String(s.total_clients ?? 0),
                  String(s.total_vendors ?? 0),
                  money(s.total_customer_payment),
                  money(s.total_vendor_payment),
                ][i] ?? c.value,
            })),
          );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-3 h-3" />;
      case "pending":
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Account Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Financial overview and payment tracking
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryStats.map((stat, idx) => {
            const Icon = stat.icon;
            const colorClasses = {
              blue: "bg-blue-50 text-blue-600",
              purple: "bg-purple-50 text-purple-600",
              green: "bg-green-50 text-green-600",
              orange: "bg-orange-50 text-orange-600",
            };
            return (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[stat.color]}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                      stat.trend === "up"
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stat.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row - Monthly Customer & Vendor Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Customer Payments Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Monthly Customer Payments
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Revenue received from customers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600">Payments</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyCustomerPayments}>
                <defs>
                  <linearGradient
                    id="customerGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  stroke="#6B7280"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yAxisTickFormatter}
                />
                <Tooltip
                  //   formatter={customerTooltipFormatter}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#customerGradient)"
                  name="Customer Payments"
                  dot={{ r: 4, fill: "#10B981", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Received</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(
                    monthlyCustomerPayments.reduce(
                      (sum, item) => sum + item.amount,
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Vendor Payments Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Monthly Vendor Payments
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Payments made to vendors
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-xs text-gray-600">Payments</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyVendorPayments}>
                <defs>
                  <linearGradient
                    id="vendorGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  stroke="#6B7280"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yAxisTickFormatter}
                />
                <Tooltip
                  //   formatter={vendorTooltipFormatter}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#vendorGradient)"
                  name="Vendor Payments"
                  dot={{ r: 4, fill: "#F59E0B", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Paid</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(
                    monthlyVendorPayments.reduce(
                      (sum, item) => sum + item.amount,
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Chart (Optional - shows both trends) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Payment Trends Overview
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Customer vs Vendor payments comparison
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">Customer Payments</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-xs text-gray-600">Vendor Payments</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                stroke="#6B7280"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisTickFormatter}
              />
              <Tooltip
                // formatter={combinedTooltipFormatter}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
              <Line
                type="monotone"
                dataKey="customerPayments"
                stroke="#10B981"
                strokeWidth={2.5}
                name="Customer Payments"
                dot={{ r: 4, fill: "#10B981", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="vendorPayments"
                stroke="#F59E0B"
                strokeWidth={2.5}
                name="Vendor Payments"
                dot={{ r: 4, fill: "#F59E0B", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Revenue and Recent Expenses Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Revenue */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Recent Revenue
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Latest incoming transactions
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {recentRevenue.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {item.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            item.status,
                          )}`}
                        >
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {item.date}
                        </div>
                        <div className="text-xs text-gray-400">
                          Fee: {formatCurrency(item.fee)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-green-600">
                        {formatCurrency(item.amount)}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 mt-1">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View All Transactions
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Recent Expenses
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Latest outgoing transactions
                  </p>
                </div>
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {recentExpenses.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {item.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            item.status,
                          )}`}
                        >
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {item.date}
                        </div>
                        <div className="text-xs text-gray-400">
                          Tax: {formatCurrency(item.fee)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-red-600">
                        {formatCurrency(item.amount)}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 mt-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View All Expenses
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
            <div className="text-xs text-emerald-400 font-medium">Net Profit</div>
            <div className="text-xl font-bold text-emerald-300">
              {formatCurrency((stats.total_customer_payment ?? 0) - (stats.total_vendor_payment ?? 0))}
            </div>
            <div className="text-xs text-emerald-400/80 mt-1">Customer - Vendor</div>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="text-xs text-blue-400 font-medium">
              Avg Customer Payment
            </div>
            <div className="text-xl font-bold text-blue-300">
              {formatCurrency((stats.total_customer_payment ?? 0) / 6)}
            </div>
            <div className="text-xs text-blue-400/80 mt-1">Monthly average</div>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
            <div className="text-xs text-purple-400 font-medium">
              Avg Vendor Payment
            </div>
            <div className="text-xl font-bold text-purple-300">
              {formatCurrency((stats.total_vendor_payment ?? 0) / 6)}
            </div>
            <div className="text-xs text-purple-400/80 mt-1">Monthly average</div>
          </div>
          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
            <div className="text-xs text-orange-400 font-medium">
              Total Transactions
            </div>
            <div className="text-xl font-bold text-orange-300">{recentRevenue.length + recentExpenses.length}</div>
            <div className="text-xs text-orange-400/80 mt-1">This period</div>
          </div>
        </div>
      </div>
    </div>
  );
};
