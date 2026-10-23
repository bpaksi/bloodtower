/**
 * Story-board toasts (decision 0003). One toast per error code. A repeat of that code
 * raises the count and the log still keeps every line. A toast fades after a few seconds.
 * The board does not act on it.
 */

export const TOAST_FADE_MS = 6_000;

export interface ErrorToast {
  code: string;
  count: number;
  message: string;
  /** Hidden once `now` passes this epoch millisecond. */
  until: number;
}

export const pushErrorToast = (
  toasts: readonly ErrorToast[],
  input: { code: string; message: string },
  now: number,
  fadeMs = TOAST_FADE_MS,
): ErrorToast[] => {
  const until = now + fadeMs;
  const index = toasts.findIndex((toast) => toast.code === input.code);
  if (index === -1) {
    return [...toasts, { code: input.code, count: 1, message: input.message, until }];
  }
  return toasts.map((toast, i) =>
    i === index ? { ...toast, count: toast.count + 1, message: input.message, until } : toast,
  );
};

export const visibleErrorToasts = (toasts: readonly ErrorToast[], now: number): ErrorToast[] =>
  toasts.filter((toast) => toast.until > now);
