import { PAGE_ERROR_CODE, UNHANDLED_REJECTION_CODE, WINDOW_ERROR_CODE } from "./pageLogCodes.ts";

/**
 * Page capture (decision 0003). A render error, `window.onerror` and `unhandledrejection`
 * are logged. None of them is dropped. A render error is the same failure as the window
 * event React reports for it, so that second report is not logged again.
 */

export interface CapturedPageError {
  code: string;
  message: string;
}

export const describeThrown = (cause: unknown): string => {
  if (cause instanceof Error) {
    const message = cause.message.trim() === "" ? cause.name : cause.message;
    const digest =
      "digest" in cause && typeof cause.digest === "string" && cause.digest !== ""
        ? ` (${cause.digest})`
        : "";
    return `${message}${digest}`;
  }
  if (typeof cause === "string" && cause.trim() !== "") return cause;
  return "The page hit an error with no message.";
};

export const captureRenderError = (error: unknown, componentStack?: string): CapturedPageError => {
  const detail = describeThrown(error);
  const stack = componentStack?.trim();
  return {
    code: PAGE_ERROR_CODE,
    message: stack ? `${detail}\n${stack}` : detail,
  };
};

export const captureWindowError = (event: {
  message?: string;
  error?: unknown;
}): CapturedPageError => {
  const fromError = event.error === undefined ? "" : describeThrown(event.error);
  const fromMessage = event.message?.trim() ?? "";
  return {
    code: WINDOW_ERROR_CODE,
    message: fromError || fromMessage || "The page hit an error with no message.",
  };
};

export const captureRejection = (event: { reason?: unknown }): CapturedPageError => ({
  code: UNHANDLED_REJECTION_CODE,
  message:
    event.reason === undefined
      ? "A promise was rejected with no reason."
      : describeThrown(event.reason),
});

let recentRender: { message: string; at: number } | null = null;

/** The boundary already logged this render error. The matching window event is the same one. */
export const noteBoundaryCatch = (message: string, now = Date.now()): void => {
  recentRender = { message, at: now };
};

export const isDuplicateRenderReport = (message: string, now = Date.now()): boolean => {
  if (!recentRender) return false;
  if (now - recentRender.at > 1000) return false;
  return (
    message === recentRender.message ||
    message.includes(recentRender.message) ||
    recentRender.message.includes(message)
  );
};

export const installPageCapture = (
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  onError: (captured: CapturedPageError) => void,
): (() => void) => {
  const onWindow = (event: Event) => {
    const record = event as Event & { message?: string; error?: unknown };
    const captured = captureWindowError({ message: record.message, error: record.error });
    if (isDuplicateRenderReport(captured.message)) return;
    onError(captured);
  };
  const onRejection = (event: Event) => {
    const record = event as Event & { reason?: unknown };
    onError(captureRejection({ reason: record.reason }));
  };
  target.addEventListener("error", onWindow);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onWindow);
    target.removeEventListener("unhandledrejection", onRejection);
  };
};
