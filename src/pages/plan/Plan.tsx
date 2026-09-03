/**
 * File: src/pages/plan/Plan.tsx
 * Subscription Setting page: shows available plans with feature comparison and
 * a Monthly/Yearly billing toggle.
 *
 * Data loaded from the backend:
 *   GET /subscription/plans?page=&limit=  -> { pagination, data: ApiPlan[] }
 *
 * Actions:
 *   Free plan  -> POST /subscription/subscribe   body: { plan, period }
 *   Paid plan  -> POST /subscription/checkout     body: { planId, billing_cycle,
 *                   successUrl, cancelUrl } -> returns a hosted-checkout URL we
 *                   redirect the browser to.
 *   Trial      -> POST /subscription/start-trial  body: { planId }
 *
 * The feature-comparison rows are derived from the union of every plan's
 * `modules` array, so the grid reflects whatever the backend returns.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Check,
  X,
  Clock,
  Globe,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { api } from "../../lib/api/client";
import { alertApiError, alertSuccess } from "../../utils/alert";

/* ---------- Types ---------- */
interface PlanFeature {
  value: string;
  label: string;
}

/** Normalized plan used by the UI. */
interface Plan {
  id: string;
  name: string; // identifier used by subscribe / start-trial actions
  label: string; // display name
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isFree: boolean;
  users: number;
  trialDays: number; // 0 when the plan has no trial
  modules: string[];
}

/** Raw plan shape from GET /subscription/plans -> data[]. */
interface ApiPlan {
  _id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  free_plan: boolean;
  trial: boolean;
  trial_days: number;
  status: boolean;
  number_of_users: number;
  modules: string[];
  limits: Record<string, unknown>;
  createdAt: string;
}

/** Pagination envelope shared by the list endpoints. */
interface Pagination {
  totalPage: number;
  currentPage: number;
  prevPage: number;
  nextPage: number;
  totalData: number;
}

interface PlansResponse {
  pagination: Pagination;
  data: ApiPlan[];
}

/** data payload of POST /subscription/checkout (envelope unwrapped by the api client). */
interface CheckoutResponse {
  url: string; // hosted Stripe checkout URL to redirect to
  sessionId?: string;
}

/* ---------- Helpers ---------- */
/** Pretty labels for module slugs; known acronyms stay uppercase. */
const MODULE_LABELS: Record<string, string> = {
  hrm: "HRM",
  crm: "CRM",
  pos: "POS",
};
const formatModule = (value: string): string =>
  MODULE_LABELS[value] ??
  value
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** Map a raw API plan to the UI model. */
const mapPlan = (p: ApiPlan): Plan => ({
  id: p._id,
  name: p.name,
  label: p.name,
  description: p.description,
  monthlyPrice: p.price_monthly,
  yearlyPrice: p.price_yearly,
  isFree: p.free_plan,
  users: p.number_of_users,
  trialDays: typeof p.trial_days === "number" ? p.trial_days : 0,
  modules: Array.isArray(p.modules) ? p.modules : [],
});

const PAGE_SIZE = 10;

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
];

/* ===================================================================== */
/*                       SUBSCRIPTION SETTING                            */
/* ===================================================================== */
export const Plan: React.FC = () => {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // ── Plans from the backend ───────────────────────────────────────────────
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionPlan, setActionPlan] = useState<string | null>(null); // plan currently being acted on

  // Load one page of plans. Uses api.raw so we can read the pagination envelope
  // (api.get unwraps only the `data` field).
  const loadPlans = useCallback(async (targetPage: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.raw.get("/subscription/plans", {
        params: { page: targetPage, limit: PAGE_SIZE },
      });
      const body = res.data as PlansResponse;
      setPlans(Array.isArray(body?.data) ? body.data.map(mapPlan) : []);
      setPagination(body?.pagination ?? null);
    } catch (err) {
      setLoadError("Couldn't load subscription plans. Please try again.");
      alertApiError(err, "Couldn't load subscription plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  // (Re)load plans whenever the page changes.
  useEffect(() => {
    loadPlans(page);
  }, [page, loadPlans]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleSubscribe = async (plan: Plan) => {
    setActionPlan(plan.name);
    try {
      // Free plans are activated directly; paid plans go through hosted checkout.
      if (plan.isFree) {
        await api.post("/subscription/assign-free", {
          planId: plan.id,
          billing_cycle: period,
        });
        await alertSuccess("Free plan activated successfully.");
        return;
      }

      const origin = window.location.origin;
      const res = await api.post<CheckoutResponse>("/subscription/checkout", {
        planId: plan.id,
        billing_cycle: period,
        successUrl: `${origin}/checkout/success`,
        cancelUrl: `${origin}/checkout/cancel`,
      });

      if (res?.url) {
        // Redirect to Stripe's hosted checkout page.
        window.location.href = res.url;
      } else {
        alertApiError(
          new Error("No checkout URL was returned."),
          "Couldn't start checkout.",
        );
      }
    } catch (err) {
      alertApiError(err, "Couldn't start checkout.");
    } finally {
      setActionPlan(null);
    }
  };

  const handleStartTrial = async (plan: Plan) => {
    setActionPlan(plan.name);
    try {
      await api.post("/subscription/start-trial", { planId: plan.id });
      await alertSuccess("Trial started successfully.");
    } catch (err) {
      alertApiError(err, "Couldn't start trial.");
    } finally {
      setActionPlan(null);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  // Feature-comparison rows: the union of every plan's modules on this page.
  const features: PlanFeature[] = useMemo(() => {
    const values = new Set<string>();
    plans.forEach((p) => p.modules.forEach((m) => values.add(m)));
    return Array.from(values)
      .sort()
      .map((value) => ({ value, label: formatModule(value) }));
  }, [plans]);

  const enabledCount = (plan: Plan) =>
    features.filter((f) => plan.modules.includes(f.value)).length;

  // Build grid template so it scales with the number of plans returned by the API.
  const gridCols = {
    gridTemplateColumns: `minmax(0,1fr) repeat(${Math.max(plans.length, 1)}, minmax(0,1fr))`,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Breadcrumb + Language */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              Subscription Setting
            </span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {languages.find((lang) => lang.code === selectedLanguage)?.name}
              <ChevronRight className="w-3 h-3 rotate-90" />
            </button>
            {showLanguageDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLanguageDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 ${
                        selectedLanguage === lang.code
                          ? "bg-teal-50 text-teal-600"
                          : "text-gray-700"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Header + Period toggle */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Subscription Setting
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Choose the plan that fits your team
            </p>
          </div>
          <div className="inline-flex p-1 bg-white border border-gray-200 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-5 py-1.5 text-sm rounded-md transition-colors ${
                period === "monthly"
                  ? "bg-teal-500 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`px-5 py-1.5 text-sm rounded-md transition-colors ${
                period === "yearly"
                  ? "bg-teal-500 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Loading / error / empty */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading plans…</span>
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-sm text-red-600 text-center">
            {loadError}
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-sm text-gray-500 text-center">
            No plans available.
          </div>
        ) : (
          <>
            {/* Top row: Plan summary cards */}
            <div className="grid gap-4 mb-4" style={gridCols}>
              {/* Features label card */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center min-h-[230px]">
                <div className="text-lg font-semibold text-gray-700">
                  Features
                </div>
              </div>

              {plans.map((plan) => {
                const price =
                  period === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
                return (
                  <div
                    key={plan.name}
                    className="relative bg-white rounded-xl shadow-sm flex flex-col items-center pt-8 pb-5 px-5 min-h-[230px] border border-gray-100"
                  >
                    <div className="text-lg font-semibold text-gray-800 mt-1">
                      {plan.label}
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-1 px-2">
                      {plan.description}
                    </div>

                    <div className="mt-4 text-center">
                      {plan.isFree ? (
                        <>
                          <div className="text-4xl font-extrabold text-gray-900 leading-none">
                            Free
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Forever
                          </div>
                        </>
                      ) : (
                        <div className="leading-none">
                          <span className="text-4xl font-extrabold text-gray-900">
                            {price}$
                          </span>
                          <span className="text-gray-500 text-sm">
                            /{period === "monthly" ? "mo" : "yr"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 w-full space-y-1.5">
                      <div className="flex items-center text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-2" />
                        {plan.users} users
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-2" />
                        {plan.modules.length} modules
                      </div>
                      {plan.trialDays > 0 && (
                        <div className="flex items-center text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-2" />
                          {plan.trialDays}d trial
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom row: Feature comparison */}
            <div className="grid gap-4" style={gridCols}>
              {/* Features list column */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="bg-gray-50 border-b border-gray-100 py-3 text-center text-sm font-medium text-gray-600">
                  Features
                </div>
                {features.map((f) => (
                  <div
                    key={f.value}
                    className="h-[38px] flex items-center justify-center text-sm text-gray-600 border-b border-gray-50 last:border-b-0"
                  >
                    {f.label}
                  </div>
                ))}
              </div>

              {plans.map((plan) => {
                const count = enabledCount(plan);
                const isBusy = actionPlan === plan.name;
                return (
                  <div
                    key={plan.name}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                  >
                    <div className="bg-gray-50 border-b border-gray-100 py-3 text-center text-sm font-medium text-gray-600">
                      {count}/{features.length} Enabled
                    </div>
                    <div className="flex-1">
                      {features.map((f) => {
                        const ok = plan.modules.includes(f.value);
                        return (
                          <div
                            key={f.value}
                            className="h-[38px] flex items-center justify-center border-b border-gray-50 last:border-b-0"
                          >
                            {ok ? (
                              <span className="w-5 h-5 rounded-full bg-teal-50 border border-teal-500 flex items-center justify-center">
                                <Check
                                  className="w-3 h-3 text-teal-600"
                                  strokeWidth={3}
                                />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-red-50 border border-red-400 flex items-center justify-center">
                                <X
                                  className="w-3 h-3 text-red-500"
                                  strokeWidth={3}
                                />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-3 space-y-2">
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={isBusy}
                        className="w-full px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                      >
                        {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {plan.isFree ? "Subscribe to Plan" : "Subscribe & Pay"}
                      </button>
                      {plan.trialDays > 0 && (
                        <button
                          onClick={() => handleStartTrial(plan)}
                          disabled={isBusy}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Start Trial ({plan.trialDays}d)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPage > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPage} ·{" "}
                  {pagination.totalData} plans
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Previous
                  </button>
                  {Array.from({ length: pagination.totalPage }, (_, i) => i + 1).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          page === pageNumber
                            ? "bg-teal-500 text-white"
                            : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPage, p + 1))
                    }
                    disabled={page >= pagination.totalPage || loading}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
