/**
 * File: src/auth/roles.ts
 * Central definition of the application roles.
 *
 * The backend is the source of truth for a user's role and permissions (both
 * arrive in the login / my-profile response). These constants exist so the UI
 * can reference roles type-safely and render the "login as …" selector and any
 * role-based guards consistently.
 */

export const ROLES = {
  SUPERADMIN: "superadmin",
  COMPANY: "company",
  CLIENT: "client", // a.k.a. "customer" in the UI
  STAFF: "staff",
  VENDOR: "vendor",
  HR: "hr",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Human-friendly labels for each role. */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPERADMIN]: "Super Admin",
  [ROLES.COMPANY]: "Company",
  [ROLES.CLIENT]: "Customer",
  [ROLES.STAFF]: "Staff",
  [ROLES.VENDOR]: "Vendor",
  [ROLES.HR]: "HR",
};

/**
 * Demo credentials used by the "Login as …" quick-select on the login page.
 * Selecting a role prefills the form so testers don't have to type. The seed
 * accounts all share the same password.
 *
 * Remove (or gate behind a dev flag) once real accounts are in use.
 */
const DEMO_PASSWORD = "1qazxsw2";

export interface RolePreset {
  role: Role;
  label: string;
  email: string;
  password: string;
}

export const ROLE_LOGIN_PRESETS: RolePreset[] = [
  ROLES.SUPERADMIN,
  ROLES.COMPANY,
  ROLES.HR,
  ROLES.STAFF,
  ROLES.VENDOR,
  ROLES.CLIENT,
].map((role) => ({
  role,
  label: ROLE_LABELS[role],
  // Seed emails follow the `<role>@gmail.com` convention.
  email: `${role}@gmail.com`,
  password: DEMO_PASSWORD,
}));
