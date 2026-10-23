"use client";

import type { ErrorToast } from "../../lib/errorToasts.ts";

/** Corner toasts on the Story board. Display only: no button, and they fade. */
export function StoryToasts({ toasts }: { toasts: readonly ErrorToast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="bt-toasts" aria-live="polite" data-presentation="toasts">
      {toasts.map((toast) => (
        <p
          key={`${toast.code}:${toast.count}`}
          className="bt-toast"
          role="status"
          data-error-code={toast.code}
        >
          <span className="bt-toast-code">{toast.code}</span>
          {toast.count > 1 ? <span className="bt-toast-count">×{toast.count}</span> : null}
        </p>
      ))}
    </div>
  );
}
