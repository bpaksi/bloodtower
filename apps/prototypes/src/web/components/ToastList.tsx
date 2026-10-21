import type { Toast } from "../lib/logger.ts";

export function ToastList({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        display: "grid",
        gap: 8,
        zIndex: 1000,
        maxWidth: 420,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          data-toast
          style={{
            background: "#7b1e1e",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <strong>{t.code}</strong>: {t.message}
          {t.count > 1 ? <span data-toast-count> ×{t.count}</span> : null}{" "}
          <button type="button" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
