"use client";

/** The in-world card for an error the page cannot recover from (decision 0003). */
export const MIST_COPY = "The mists close in…";

const reloadPage = () => {
  window.location.reload();
};

/**
 * One Reload button and the error code that matches the log line.
 * Nothing reloads, reconnects or retries on its own.
 */
export function MistCard({ code, onReload }: { code: string; onReload?: () => void }) {
  return (
    <div className="bt-mist" role="alert" data-presentation="mist" data-error-code={code}>
      <p className="bt-mist-copy">{MIST_COPY}</p>
      <p className="bt-mist-code">{code}</p>
      <button type="button" className="bt-primary" onClick={onReload ?? reloadPage}>
        Reload
      </button>
    </div>
  );
}
