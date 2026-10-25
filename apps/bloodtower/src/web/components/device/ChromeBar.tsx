"use client";

import { type ReactNode, useEffect, useState } from "react";
import { IpadCorners } from "./IpadCorners.tsx";

type Offer = {
  promptId: string;
  actionId: string;
  label: string;
};

/** The iPad bottom bar and its Menu dialog. A shell: it opens and closes and writes nothing. */
export function ChromeBar({
  live,
  back,
  connect,
  quit,
  onAct,
}: {
  live: boolean;
  back?: Offer;
  connect?: Offer;
  quit?: Offer;
  onAct?: (promptId: string, actionId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const offer = (item: Offer, label: ReactNode) => (
    <button
      type="button"
      className="bt-secondary"
      data-prompt-id={item.promptId}
      data-action-id={item.actionId}
      data-action={item.actionId}
      disabled={!live || !onAct}
      onClick={() => {
        setMenuOpen(false);
        onAct?.(item.promptId, item.actionId);
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <IpadCorners />
      {menuOpen ? (
        <div className="bt-menu-dialog" role="dialog" aria-label="Menu" data-menu>
          <section>
            <h2>Look up</h2>
            <div>Nothing to look up.</div>
          </section>
          <section>
            <h2>Table</h2>
            {connect ? offer(connect, connect.label) : <div>The table stays as it is.</div>}
          </section>
          <section>
            <h2>Leave</h2>
            {quit ? offer(quit, "Quit story") : <div>Quit story is not offered.</div>}
          </section>
        </div>
      ) : null}
      <nav className="bt-bottom-bar" data-bottom-bar aria-label="Chrome">
        {back ? (
          <button
            type="button"
            className="bt-ghost"
            data-prompt-id={back.promptId}
            data-action-id={back.actionId}
            data-action="back"
            disabled={!live || !onAct}
            onClick={() => onAct?.(back.promptId, back.actionId)}
          >
            Back
          </button>
        ) : (
          <button type="button" className="bt-ghost" data-action="back" disabled>
            Back
          </button>
        )}
        <button type="button" className="bt-ghost" data-action="replay" disabled>
          Replay
        </button>
        <button
          type="button"
          className="bt-ghost"
          data-action="menu"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg
            aria-hidden="true"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
            <circle cx="12" cy="12" r="6.8" />
          </svg>
        </button>
      </nav>
    </>
  );
}
