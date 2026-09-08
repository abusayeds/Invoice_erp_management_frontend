/**
 * File: src/lib/api/client.ts
 * The single axios instance used by the whole app.
 *
 * - baseURL comes from env (src/lib/env.ts)
 * - the auth token is injected automatically on every request
 * - responses are unwrapped (returns `response.data`) and errors normalized
 *   to ApiError, so callers get plain data or a typed error.
 *
 * Usage:
 *   import { api } from "@/lib/api/client";
 *   const invoices = await api.get<Invoice[]>("/invoices");
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL } from "../env";
import { getToken, clearToken } from "./tokenStore";
import { toApiError } from "./ApiError";

/** Called when a 401 is received, so the app can react (e.g. redirect to login). */
let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Request: attach bearer token ────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
);

// ── Response: unwrap data, normalize errors, handle 401 ─────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      clearToken();
      unauthorizedHandler?.();
    }
    return Promise.reject(apiError);
  },
);

/**
 * Many REST backends wrap payloads as `{ data, message }`. We unwrap a single
 * `data` envelope automatically so callers receive the resource directly. If
 * your backend returns the resource at the top level, this is a no-op.
 */
function unwrap<T>(payload: any): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export const api = {
  raw: axiosInstance,

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.get(url, config);
    return unwrap<T>(res.data);
  },
  async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.post(url, body, config);
    return unwrap<T>(res.data);
  },
  async put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.put(url, body, config);
    return unwrap<T>(res.data);
  },
  async patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.patch(url, body, config);
    return unwrap<T>(res.data);
  },
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.delete(url, config);
    return unwrap<T>(res.data);
  },
};

export default api;
