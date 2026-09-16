/**
 * My Account modal — opened from header company avatar → My Account.
 * Shows email, phone, current plan, and a dashboard promo banner.
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X,
  Pencil,
  BadgeCheck,
  FileText,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { toArray } from "@/services/_http";
import useAuth from "@/hooks/useAuth";
import myAccountPromo from "@/assets/my-account-promo.png";

type Props = { open: boolean; onClose: () => void };

type PlanRow = {
  id: string;
  name: string;
  detail: string;
  status: "Active" | "Expired" | "None";
  channel: string;
  actionLabel: string;
  actionPath: string;
};

export const MyAccountModal: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState(user?.name || "");
  const [plan, setPlan] = useState<PlanRow | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    void (async () => {
      let nextEmail = user?.email || "";
      let nextPhone = "";
      let nextName = user?.name || "";
      let nextPlan: PlanRow | null = null;

      try {
        const res = await api.raw.get("/company-register/all");
        const list = toArray<any>(res.data);
        const owner = list.find((c) => c.is_owner) || list[0];
        if (owner) {
          nextName = String(owner.business_name || nextName).trim() || nextName;
          nextEmail = String(owner.email || nextEmail).trim() || nextEmail;
          nextPhone = String(owner.phone || owner.mobile || "").trim();
        }
      } catch {
        /* keep auth defaults */
      }

      try {
        const sub = await api.get<any>("/subscription/my-subscription");
        if (sub && sub.exists !== false && (sub.plan_name || sub.plan_id)) {
          const expired = !!sub.expired || sub.status === "expired" || sub.status === "cancelled";
          const users =
            sub.number_of_users == null || Number(sub.number_of_users) < 0
              ? "Unlimited users"
              : `${sub.number_of_users} User${Number(sub.number_of_users) === 1 ? "" : "s"}`;
          nextPlan = {
            id: String(sub._id || sub.plan_id || "current"),
            name: String(sub.plan_name || "Premium"),
            detail: `1 Business, ${users}`,
            status: expired ? "Expired" : "Active",
            channel: sub.is_trial ? "Trial" : String(sub.billing_cycle || "Web"),
            actionLabel: expired ? "Renew" : "Upgrade Now",
            actionPath: "/plan",
          };
        }
      } catch {
        /* no plan */
      }

      if (!alive) return;
      setEmail(nextEmail);
      setPhone(nextPhone);
      setCompanyName(nextName);
      setPlan(nextPlan);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, user?.email, user?.name]);

  if (!open) return null;

  const goPlan = () => {
    onClose();
    navigate("/plan");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 p-4 overflow-y-auto"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] my-8 rounded-xl overflow-hidden shadow-2xl border border-white/10"
        style={{ background: "#2a313a", color: "#fff" }}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center h-12 px-3 border-b border-white/10">
          <h2 className="text-[15px] font-semibold tracking-wide">My Account</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 p-1.5 rounded-md hover:bg-white/10 text-white/80"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-white/60">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading account…
          </div>
        ) : (
          <>
            <div className="px-5 pt-5 pb-2 space-y-4">
              <Field
                label="Account Email*"
                value={email || "—"}
                verified={!!email}
                onEdit={() => {
                  onClose();
                  navigate("/companies");
                }}
              />
              <Field
                label="Phone Number"
                value={phone || "Not set"}
                verified={!!phone}
                onEdit={() => {
                  onClose();
                  navigate("/companies");
                }}
              />
            </div>

            <div className="px-5 pt-3 pb-4">
              <h3 className="text-sm font-semibold mb-3">My Plan</h3>
              {plan ? (
                <PlanCard
                  icon={plan.status === "Expired" ? ShoppingBag : FileText}
                  name={plan.name}
                  detail={plan.detail}
                  status={plan.status}
                  channel={plan.channel}
                  actionLabel={plan.actionLabel}
                  onAction={goPlan}
                />
              ) : (
                <PlanCard
                  icon={FileText}
                  name="No plan"
                  detail={companyName ? `${companyName}` : "Choose a subscription"}
                  status="None"
                  channel="Web"
                  actionLabel="View Plans"
                  onAction={goPlan}
                />
              )}
            </div>

            <div className="mx-5 mb-6 rounded-lg overflow-hidden border border-white/10">
              <img
                src={myAccountPromo}
                alt="Dashboard preview"
                className="w-full h-auto max-h-[320px] object-cover object-top block"
              />
            </div>
            <p className="text-center text-sm font-medium text-white/90 px-5 pb-6">
              One plan for All Platform Apps
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  verified?: boolean;
  onEdit: () => void;
}> = ({ label, value, verified, onEdit }) => (
  <div>
    <label className="block text-xs text-white/55 mb-1.5">{label}</label>
    <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-white/15 bg-[#1f252c]">
      {verified ? (
        <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <BadgeCheck className="w-3.5 h-3.5 text-white" />
        </span>
      ) : (
        <span className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0" />
      )}
      <span className="flex-1 min-w-0 text-sm text-white truncate">{value}</span>
      {verified ? <span className="text-xs text-blue-400 flex-shrink-0">Verified</span> : null}
      <button
        type="button"
        onClick={onEdit}
        className="p-1 rounded hover:bg-white/10 text-white/80 flex-shrink-0"
        title="Edit"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const PlanCard: React.FC<{
  icon: React.ElementType;
  name: string;
  detail: string;
  status: "Active" | "Expired" | "None";
  channel: string;
  actionLabel: string;
  onAction: () => void;
}> = ({ icon: Icon, name, detail, status, channel, actionLabel, onAction }) => (
  <div className="flex items-center gap-3 py-3 border-b border-white/10 last:border-b-0">
    <div className="w-11 h-11 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-white truncate">{name}</p>
      <p className="text-xs text-white/50 truncate">{detail}</p>
    </div>
    <div className="text-right flex-shrink-0 mr-2">
      <p
        className={`text-sm font-semibold ${
          status === "Active" ? "text-emerald-400" : status === "Expired" ? "text-red-400" : "text-white/50"
        }`}
      >
        {status === "None" ? "—" : status}
      </p>
      <p className="text-[11px] text-white/45 capitalize">{channel}</p>
    </div>
    <button
      type="button"
      onClick={onAction}
      className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#3a424c] hover:bg-[#454e5a] text-white border border-white/10 whitespace-nowrap"
    >
      {actionLabel}
    </button>
  </div>
);

export default MyAccountModal;
