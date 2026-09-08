const toastEventTarget = new EventTarget();

export type ToastType = "success" | "info" | "error" | "warning";

export const showToast = (
  message: string,
  type: ToastType = "info",
) => {
  toastEventTarget.dispatchEvent(
    new CustomEvent("toast", { detail: { message, type } }),
  );
};

export { toastEventTarget };
