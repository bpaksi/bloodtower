"use client";

import { useEffect, useState } from "react";

/**
 * Join landing. A device with a code waits, then the host opens /device.
 * Holdings change only from Party Join. The device token is never shown.
 */
export function JoinScreen({
  live,
  code,
  onRejoin,
}: {
  live: boolean;
  code: string | null;
  onRejoin?: (token: string) => void;
}) {
  const [urlCode, setUrlCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
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
        <p className="text-xl text-[var(--bt-muted)]">
          {shown
            ? "This iPad enters the table when the host is ready."
            : "Type the six-digit join code shown on the Story board, or paste a rejoin token."}
        </p>
      </header>
      {live ? null : <p>Session host unavailable.</p>}
      {shown ? (
        <article className="bt-card space-y-3 text-2xl">
          <p>Game is loading...</p>
          <p className="text-5xl tracking-widest">{shown}</p>
        </article>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const digits = joinCode.replace(/\D/g, "");
            if (digits.length !== 6) return;
            window.location.assign(`/join?code=${digits}`);
          }}
        >
          <label className="flex flex-col gap-2 text-lg">
            Join code
            <input
              className="min-h-14 bg-[var(--bt-card)] px-3 text-3xl tracking-[0.35em]"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
          <button type="submit" className="bt-primary" disabled={joinCode.length !== 6}>
            Enter the table
          </button>
        </form>
      )}
      {shown ? null : (
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
      )}
    </main>
  );
}
