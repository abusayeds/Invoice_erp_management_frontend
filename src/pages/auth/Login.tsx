/**
 * File: src/pages/auth/Login.tsx
 * Login page - Email/Password authentication with a "Login as …" role selector.
 *
 * Role chips are loaded from GET /user/login-presets so labels/emails stay in
 * sync with real users (same role set as User Roles). Selecting a chip prefills
 * email + demo password. Actual role/permissions always come from the login
 * response.
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { SocialLogin } from "../../components/auth/SocialLogin";
import useAuth from "../../hooks/useAuth";
import { alertApiError, alertToast } from "../../utils/alert";
import { api } from "../../lib/api/client";
import { ROLE_LOGIN_PRESETS, type RolePreset } from "../../auth/roles";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [presets, setPresets] = useState<RolePreset[]>(ROLE_LOGIN_PRESETS);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.get<RolePreset[]>("/user/login-presets", {
          skipGlobalLoading: true,
          skipUnauthorized: true,
        });
        if (!active) return;
        if (Array.isArray(data) && data.length > 0) {
          setPresets(
            data.map((p) => ({
              role: p.role as RolePreset["role"],
              label: p.label,
              email: p.email,
              password: p.password || "1qazxsw2",
            })),
          );
        }
      } catch {
        // Keep static ROLE_LOGIN_PRESETS fallback.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(formData.email, formData.password);
      alertToast(`Welcome back, ${user.name || "user"}!`, "success");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      alertApiError(err, "Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectRole = (roleKey: string) => {
    const preset = presets.find((p) => p.role === roleKey);
    if (!preset) return;
    setSelectedRole(roleKey);
    setFormData((prev) => ({
      ...prev,
      email: preset.email,
      password: preset.password,
    }));
  };

  return (
    <AuthLayout title="Welcome!" subtitle="Login to your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Login as
          </label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.role}
                type="button"
                onClick={() => handleSelectRole(preset.role)}
                className={`px-3 py-2 rounded-md border text-left transition-all ${
                  selectedRole === preset.role
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <div className="text-xs font-medium">{preset.label}</div>
                <div className="mt-0.5 truncate text-[10px] opacity-60">
                  {preset.email}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Enter your email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="name@example.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Enter your Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
              Remember me
            </label>
          </div>
          <Link
            to="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Logging in..." : "Login"}
        </button>

        <SocialLogin />
      </form>
    </AuthLayout>
  );
};
