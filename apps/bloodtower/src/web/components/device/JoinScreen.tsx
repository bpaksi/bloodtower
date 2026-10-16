"use client";

import { useEffect, useState } from "react";
import { detectFormFactor, layoutFor, type PlayerLayout } from "./formFactor";

export interface JoinHunter {
  id: string;
  name: string;
}

/**
 * Join landing. Holdings change only from here, and only once a session host is connected.
 */
export function JoinScreen({
  live,
  code,
  hunters,
  held,
  onHold,
  onRejoin,
  formFactor,
}: {
  live: boolean;
  code: string | null;
  hunters: readonly JoinHunter[];
  held: readonly string[];
  onHold?: (hunter: string, action: "take" | "release") => void;
  onRejoin?: (token: string) => void;
  /** Pass a form factor in tests. Omitted, the screen reads the browser. */
  formFactor?: "ipad" | "phone";
}) {
  const [urlCode, setUrlCode] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [detected, setDetected] = useState<"ipad" | "phone">(formFactor ?? "ipad");
  const [preference, setPreference] = useState<PlayerLayout | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("code");
    if (value && /^\d{6}$/.test(value)) setUrlCode(value);
    if (!formFactor) setDetected(detectFormFactor(navigator.userAgent));
  }, [formFactor]);
  const shown = code ?? urlCode;
  const layout = layoutFor(formFactor ?? detected, preference);
  return (
    <main
      className={`mx-auto flex min-h-dvh flex-col gap-6 px-6 py-10 ${layout === "phone" ? "max-w-sm" : "max-w-xl"}`}
      data-layout={layout}
    >
      <h1 className="text-3xl">Join</h1>
      {detected === "phone" ? (
        <button
          type="button"
          data-action="layout"
          onClick={() => setPreference(layout === "phone" ? "full" : "phone")}
        >
          {layout === "phone" ? "Use the full layout" : "Use the phone layout"}
        </button>
      ) : null}
      {live ? null : <p>Session host unavailable.</p>}
      <p className="text-4xl tracking-widest">{shown ?? "Join code unavailable."}</p>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-wide">Hunters</h2>
        {hunters.length === 0 ? <p>Hunters unavailable.</p> : null}
        {hunters.map((hunter) => {
          const mine = held.includes(hunter.id);
          return (
            <button
              key={hunter.id}
              type="button"
              disabled={!live}
              data-action={mine ? "release" : "take"}
              data-hunter={hunter.id}
              onClick={() => onHold?.(hunter.id, mine ? "release" : "take")}
            >
              {mine ? `Release ${hunter.name}` : `Hold ${hunter.name}`}
            </button>
          );
        })}
      </section>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = token.trim();
          if (next.length === 0) return;
          onRejoin?.(next);
        }}
      >
        <label>
          Rejoin token
          <input
            name="token"
            value={token}
            disabled={!live}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <button type="submit" disabled={token.trim().length === 0 || (!live && !onRejoin)}>
          Rejoin
        </button>
      </form>
    </main>
  );
}
