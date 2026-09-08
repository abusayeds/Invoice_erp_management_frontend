/**
 * File: src/pages/auth/Login.tsx
 * Login page - Email/Password authentication with a "Login as …" role selector.
 *
 * The role buttons are a convenience for testing the six roles (superadmin,
 * company, hr, staff, vendor, customer): selecting one prefills the seed
 * credentials. The actual role/permissions always come from the backend in the
 * login response.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { SocialLogin } from "../../components/auth/SocialLogin";
import useAuth from "../../hooks/useAuth";
import { alertApiError, alertToast } from "../../utils/alert";
import { ROLE_LOGIN_PRESETS, type Role } from "../../auth/roles";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(formData.email, formData.password);
      alertToast(`Welcome back, ${user.name || "user"}!`, "success");
      navigate("/", { replace: true });
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

  const handleSelectRole = (role: Role) => {
    const preset = ROLE_LOGIN_PRESETS.find((p) => p.role === role);
    if (!preset) return;
    setSelectedRole(role);
    setFormData((prev) => ({
      ...prev,
      email: preset.email,
      password: preset.password,
    }));
  };

  return (
    <AuthLayout title="Welcome!" subtitle="Login to your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Login as
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ROLE_LOGIN_PRESETS.map((preset) => (
              <button
                key={preset.role}
                type="button"
                onClick={() => handleSelectRole(preset.role)}
                className={`px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                  selectedRole === preset.role
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Email Field */}
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

        {/* Password Field */}
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

        {/* Remember Me Checkbox */}
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Logging in..." : "Login"}
        </button>

        {/* Social Login */}
        <SocialLogin />
      </form>
    </AuthLayout>
  );
};
