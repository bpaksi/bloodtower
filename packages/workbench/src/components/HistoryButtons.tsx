"use client";

import { useEffect, useState } from "react";

/** The parts of the Navigation API used here; browsers without it leave both buttons enabled. */
type NavigationLike = EventTarget & { canGoBack: boolean; canGoForward: boolean };

function navigationApi(): NavigationLike | undefined {
  return (globalThis as { navigation?: NavigationLike }).navigation;
}

/**
 * Back and forward buttons that step through the browser history, like the browser's own. Each
 * focus change in the graph is a history entry (?focus=), so they walk the cards Bob visited.
 */
export function HistoryButtons() {
  const [can, setCan] = useState({ back: true, forward: true });

  useEffect(() => {
    const nav = navigationApi();
    if (!nav) return;
    const read = () => setCan({ back: nav.canGoBack, forward: nav.canGoForward });
    // Next writes history inside an insertion effect, where a state update is not allowed: read
    // the new entry one tick later.
    const update = () => setTimeout(read, 0);
    read();
    nav.addEventListener("currententrychange", update);
    return () => nav.removeEventListener("currententrychange", update);
  }, []);

  return (
    <div className="history-btns">
      <button
        type="button"
        className="btn-ghost"
        aria-label="Back"
        title="Back (⌘[)"
        disabled={!can.back}
        onClick={() => window.history.back()}
      >
        ←
      </button>
      <button
        type="button"
        className="btn-ghost"
        aria-label="Forward"
        title="Forward (⌘])"
        disabled={!can.forward}
        onClick={() => window.history.forward()}
      >
        →
      </button>
    </div>
  );
}
