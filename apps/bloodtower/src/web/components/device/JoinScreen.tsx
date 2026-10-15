"use client";

import { useEffect, useState } from "react";

export interface JoinHunter {
  id: string;
  name: string;
}

/**
 * Join landing. Holdings change only from here, and only once a session host is connected.
 * The host itself arrives in a later step; until then every control is off.
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
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl">Join</h1>
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
          if (live && token) onRejoin?.(token);
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
        <button type="submit" disabled={!live || token.length === 0}>
          Rejoin
        </button>
      </form>
    </main>
  );
}
