/**
 * File: src/utils/alert.ts
 * Thin wrapper around SweetAlert2 with the app's theme baked in, plus helpers
 * that turn an ApiError into a friendly dialog.
 *
 * Usage:
 *   import { alertError, alertSuccess } from "@/utils/alert";
 *   alertSuccess("Login complete!");
 *   try { ... } catch (e) { alertApiError(e); }
 */

import Swal, { type SweetAlertOptions } from "sweetalert2";
import { ApiError } from "../lib/api/ApiError";

/** Shared look-and-feel so every dialog matches the blue UI. */
const base: SweetAlertOptions = {
  confirmButtonColor: "#2563eb", // blue-600
  cancelButtonColor: "#6b7280", // gray-500
  buttonsStyling: true,
  reverseButtons: true,
};

export function alertSuccess(message: string, title = "Success") {
  return Swal.fire({ ...base, icon: "success", title, text: message });
}

export function alertError(message: string, title = "Oops...") {
  return Swal.fire({ ...base, icon: "error", title, text: message });
}

export function alertWarning(message: string, title = "Heads up") {
  return Swal.fire({ ...base, icon: "warning", title, text: message });
}

/** Toast-style alert in the top-right corner (auto-dismiss). */
export function alertToast(
  message: string,
  icon: "success" | "error" | "warning" | "info" = "success",
) {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
}

/**
 * Map an error thrown by the API client (ApiError) to a sensible dialog.
 * Backend errors carry a human message (e.g. "Wrong password!",
 * "This account does not exist."), which we surface directly. Status drives the
 * title so the dialog reads naturally.
 */
export function alertApiError(error: unknown, fallback = "Something went wrong.") {
  let title = "Oops...";
  let message = fallback;

  if (error instanceof ApiError) {
    message = error.message || fallback;
    if (error.isNetworkError) {
      title = "Connection error";
      message =
        "Couldn't reach the server. Check your connection and try again.";
    } else if (error.status === 401) {
      title = "Login failed";
    } else if (error.status === 404) {
      title = "Account not found";
    } else if (error.status === 403) {
      title = "Access denied";
    }
  } else if (error instanceof Error) {
    message = error.message || fallback;
  }

  return alertError(message, title);
}

export default Swal;
