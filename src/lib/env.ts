/**
 * File: src/lib/env.ts
 * Centralized, typed access to environment variables.
 *
 * All runtime configuration lives here so the rest of the app never reads
 * `import.meta.env` directly. To point the app at a different backend, set
 * `VITE_API_BASE_URL` (or `VITE_BACKEND_BASE`) in your `.env` file.
 */

const backendBase =
  import.meta.env.VITE_BACKEND_BASE?.replace(/\/$/, "") ||
  "http://localhost:5500";

/** Fully-qualified REST API base URL, e.g. http://localhost:5500/api/v1 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  `${backendBase}/api/v1`;

/** localStorage key used to persist the auth token. */
export const AUTH_TOKEN_KEY: string =
  import.meta.env.VITE_AUTH_TOKEN_KEY || "qayd_token";

/** Whether we are running a production build. */
export const IS_PROD: boolean = import.meta.env.PROD;

export const env = {
  API_BASE_URL,
  AUTH_TOKEN_KEY,
  IS_PROD,
};

export default env;
