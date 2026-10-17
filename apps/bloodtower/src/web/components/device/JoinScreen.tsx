"use client";

import { useEffect, useState } from "react";

export interface JoinHunter {
  id: string;
  name: string;
}

/**
 * Join landing. Holdings change only from here or the party-join screen,
 * and only once a session host is connected. The device token is never shown.
 */
export function JoinScreen({
  live,
  code,
  hunters,
  held,
  onHold,
  onRejoin,
}: {
  live: boolean;
  code: string | null;
  hunters: readonly JoinHunter[];
  held: readonly string[];
  onHold?: (hunter: string, action: "take" | "release") => void;
  onRejoin?: (token: string) => void;
}) {
  const [urlCode, setUrlCode] = useState<string | null>(null);
  const [token, setToken] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("code");
    if (value && /^\d{6}$/.test(value)) setUrlCode(value);
  }, []);
  const shown = code ?? urlCode;
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-10" data-layout="ipad">
      <header className="space-y-2">
        <p className="bt-kicker">iPad</p>
        <h1 className="text-4xl">Join</h1>
        <p className="text-xl text-[var(--bt-muted)]">Scan the board QR, then claim hunters.</p>
      </header>
      {live ? null : <p>Session host unavailable.</p>}
      <p className="text-5xl tracking-widest">{shown ?? "Join code unavailable."}</p>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-wide">Hunters</h2>
        {hunters.length === 0 ? <p>Hunters unavailable.</p> : null}
        {hunters.map((hunter) => {
          const mine = held.includes(hunter.id);
          return (
            <button
              key={hunter.id}
              type="button"
              className="bt-ghost"
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
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const next = token.trim();
          if (next.length === 0) return;
          onRejoin?.(next);
        }}
      >
        <label className="flex flex-col gap-2 text-lg">
          Rejoin token
          <input
            className="min-h-14 bg-[var(--bt-card)] px-3 text-xl"
            name="token"
            value={token}
            disabled={!live && !onRejoin}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="bt-secondary"
          disabled={token.trim().length === 0 || (!live && !onRejoin)}
        >
          Rejoin
        </button>
      </form>
    </main>
  );
}
