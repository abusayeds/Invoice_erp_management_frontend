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
  /** Backend role value is `customer` (legacy `client` still accepted server-side). */
  CUSTOMER: "customer",
  STAFF: "staff",
  VENDOR: "vendor",
  HR: "hr",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Human-friendly labels for each role. */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPERADMIN]: "Super Admin",
  [ROLES.COMPANY]: "Company",
  [ROLES.CUSTOMER]: "Customer",
  [ROLES.STAFF]: "Staff",
  [ROLES.VENDOR]: "Vendor",
  [ROLES.HR]: "HR",
};

/**
 * Demo credentials used by the "Login as …" quick-select on the login page.
 * Selecting a role prefills the form so testers don't have to type. The seed
 * accounts share the same password (`1qazxsw2`).
 *
 * Super Admin + Company are created by backend seed (DB/index.ts). Other roles
 * use the same `<role>@gmail.com` convention when those users exist.
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
  {
    role: ROLES.SUPERADMIN,
    label: ROLE_LABELS[ROLES.SUPERADMIN],
    email: "superadmin@gmail.com",
    password: DEMO_PASSWORD,
  },
  {
    role: ROLES.COMPANY,
    label: ROLE_LABELS[ROLES.COMPANY],
    email: "company@gmail.com",
    password: DEMO_PASSWORD,
  },
  {
    role: ROLES.HR,
    label: ROLE_LABELS[ROLES.HR],
    email: "hr@gmail.com",
    password: DEMO_PASSWORD,
  },
  {
    role: ROLES.STAFF,
    label: ROLE_LABELS[ROLES.STAFF],
    email: "staff@gmail.com",
    password: DEMO_PASSWORD,
  },
  {
    role: ROLES.VENDOR,
    label: ROLE_LABELS[ROLES.VENDOR],
    email: "vendor@gmail.com",
    password: DEMO_PASSWORD,
  },
  {
    role: ROLES.CUSTOMER,
    label: ROLE_LABELS[ROLES.CUSTOMER],
    email: "customer@gmail.com",
    password: DEMO_PASSWORD,
  },
];
