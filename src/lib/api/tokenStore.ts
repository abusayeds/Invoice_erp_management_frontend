/**
 * File: src/lib/api/tokenStore.ts
 * Single source of truth for the auth token.
 *
 * Persists to localStorage and notifies subscribers (e.g. the AuthProvider and
 * the axios interceptor) when the token changes. Keeping this separate from the
 * API client avoids a circular dependency between the client and auth context.
 */

import { AUTH_TOKEN_KEY } from "../env";

type Listener = (token: string | null) => void;

let currentToken: string | null = readInitial();
const listeners = new Set<Listener>();

function readInitial(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return currentToken;
}

export function setToken(token: string | null): void {
  currentToken = token;
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  listeners.forEach((l) => l(token));
}

export function clearToken(): void {
  setToken(null);
}

/** Subscribe to token changes. Returns an unsubscribe function. */
export function onTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
