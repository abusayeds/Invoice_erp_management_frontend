/** Print a loaded PDF without opening a preview or a popup window. */
export function printPdfUrl(url: string, revokeUrl = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "Print document";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;";
    let loadTimer: ReturnType<typeof setTimeout>;
    let cleanupTimer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(loadTimer);
      clearTimeout(cleanupTimer);
      frame.remove();
      if (revokeUrl) URL.revokeObjectURL(url);
    };
    const fail = () => {
      cleanup();
      reject(new Error("Unable to open the print dialog. Please try again."));
    };
    frame.onerror = fail;
    frame.onload = () => {
      clearTimeout(loadTimer);
      try {
        const target = frame.contentWindow;
        if (!target) throw new Error("Print frame unavailable");
        target.addEventListener("afterprint", cleanup, { once: true });
        // Keep the PDF available while the native print dialog is open.
        cleanupTimer = setTimeout(cleanup, 300_000);
        target.focus();
        target.print();
        resolve();
      } catch {
        fail();
      }
    };
    loadTimer = setTimeout(fail, 60_000);
    frame.src = url;
    document.body.appendChild(frame);
  });
}
