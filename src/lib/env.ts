/**
 * File: src/lib/env.ts
 * Centralized, typed access to environment variables.
 *
 * All runtime configuration lives here so the rest of the app never reads
 * `import.meta.env` directly. To point the app at a different backend, set
 * `VITE_API_BASE_URL` (or `VITE_BACKEND_BASE`) in your `.env` file.
 */

const stripSlash = (s: string) => s.replace(/\/$/, "");

/** If API URL is absolute, derive the backend origin (for /files images). */
const originFromApiUrl = (api?: string): string => {
  const raw = String(api || "").trim();
  if (!raw || raw.startsWith("/")) return "";
  try {
    const u = new URL(raw);
    return stripSlash(`${u.protocol}//${u.host}`);
  } catch {
    return "";
  }
};

export const BACKEND_BASE_URL: string =
  stripSlash(import.meta.env.VITE_BACKEND_BASE || "") ||
  originFromApiUrl(import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:5500";

/** Fully-qualified REST API base URL, e.g. http://localhost:5500/api/v1 */
export const API_BASE_URL: string =
  stripSlash(import.meta.env.VITE_API_BASE_URL || "") ||
  `${BACKEND_BASE_URL}/api/v1`;

/** localStorage key used to persist the auth token. */
export const AUTH_TOKEN_KEY: string =
  import.meta.env.VITE_AUTH_TOKEN_KEY || "qayd_token";

/** Whether we are running a production build. */
export const IS_PROD: boolean = import.meta.env.PROD;

/**
 * Turn a stored upload path into a browser-loadable URL.
 * - http(s) / data: / blob: → unchanged
 * - Dev: root-relative `/files/...` (Vite proxies `/files` → backend)
 * - Prod: `${BACKEND_BASE_URL}/files/...` (frontend host has no /files)
 */
export function resolveMediaUrl(value: unknown): string {
  const src = String(value ?? "").trim();
  if (!src) return "";
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  const pathPart = src.startsWith("/") ? src : `/${src.replace(/^\/+/, "")}`;
  if (import.meta.env.DEV) return pathPart;
  return `${BACKEND_BASE_URL}${pathPart}`;
}

export const env = {
  BACKEND_BASE_URL,
  API_BASE_URL,
  AUTH_TOKEN_KEY,
  IS_PROD,
  resolveMediaUrl,
};

export default env;
