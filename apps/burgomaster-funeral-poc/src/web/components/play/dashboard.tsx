"use client";

import { PROTOCOL_VERSION } from "burgomaster-funeral-poc-protocols";
import { useEffect, useRef, useState } from "react";
import { helloDashboard, socketUrl, startMessage } from "@/lib/messages";
import { fetchPreloadList, loadAsset, preloadScene } from "@/lib/preload";
import { type DashboardView, isDashboardView } from "@/lib/view";

const TOKEN_KEY = "funeral.dashboard.token";

/**
 * The shared screen. Stills and portraits keep their own pixels: the frame only limits the box,
 * it does not crop or assign a size.
 */
export function DashboardScreen() {
  const [view, setView] = useState<DashboardView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const revision = useRef(0);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const cueRef = useRef<HTMLAudioElement | null>(null);
  const unlock = useRef(0);

  useEffect(() => {
    let closed = false;
    const socket = new WebSocket(socketUrl(window.location));
    socketRef.current = socket;
    const refresh = async (token: string) => {
      const response = await fetch("/view", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok || closed) return;
      const body: unknown = await response.json();
      if (closed || !isDashboardView(body) || body.revision < revision.current) return;
      revision.current = body.revision;
      setView(body);
    };
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(helloDashboard()));
    });
    socket.addEventListener("message", (event) => {
      let message: { type?: string; payload?: { token?: string; message?: string } };
      try {
        message = JSON.parse(String(event.data)) as typeof message;
      } catch {
        return;
      }
      if (message.type === "welcome" && message.payload?.token) {
        const token = message.payload.token;
        tokenRef.current = token;
        sessionStorage.setItem(TOKEN_KEY, token);
        if (!closed) {
          void preloadScene(
            () => fetchPreloadList(token),
            loadAsset,
            (phase) => {
              if (!closed) setLoadingAssets(phase === "loading");
            },
          );
        }
      }
      if (message.type === "error" && message.payload?.message) setProblem(message.payload.message);
      const token = tokenRef.current;
      if (token) void refresh(token);
    });
    socket.addEventListener("close", () => {
      if (!closed) setProblem("The host connection closed.");
    });
    return () => {
      closed = true;
      socket.close();
    };
  }, []);

  const lineKey = view?.playback?.lineKey ?? null;
  const captionUrl = view?.playback?.caption?.audioUrl ?? null;
  const elapsed = view?.playback?.caption?.elapsedMs ?? 0;
  const paused = view?.paused ?? false;
  useEffect(() => {
    const audio = voiceRef.current;
    if (!audio) return;
    if (paused || !lineKey || !captionUrl) {
      audio.pause();
      audio.dataset.hold = "1";
      return;
    }
    const sameLine = audio.dataset.line === lineKey;
    const held = audio.dataset.hold === "1";
    if (sameLine && !held) return;
    audio.dataset.line = lineKey;
    audio.dataset.hold = "0";
    audio.muted = false;
    if (!sameLine) audio.src = captionUrl;
    const start = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const target = elapsed / 1000;
      audio.currentTime = duration > 0 ? Math.min(target, Math.max(0, duration - 0.05)) : 0;
      void audio.play().catch(() => undefined);
    };
    if (audio.readyState >= 1) start();
    else audio.addEventListener("loadedmetadata", start, { once: true });
  }, [lineKey, captionUrl, elapsed, paused]);

  const musicUrl = view?.playback?.musicUrl ?? null;
  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    if (paused || !musicUrl) {
      audio.pause();
      if (paused) audio.dataset.hold = "1";
      if (!musicUrl) {
        audio.dataset.src = "";
        audio.dataset.hold = "0";
      }
      return;
    }
    const resume = audio.dataset.hold === "1" && audio.dataset.src === musicUrl;
    audio.dataset.hold = "0";
    if (audio.dataset.src === musicUrl && !resume) return;
    audio.dataset.src = musicUrl;
    if (!resume) {
      audio.src = musicUrl;
      audio.loop = true;
    }
    void audio.play().catch(() => undefined);
  }, [musicUrl, paused]);

  const cue = view?.playback?.cue ?? null;
  useEffect(() => {
    const audio = cueRef.current;
    if (!audio) return;
    if (paused) {
      audio.pause();
      return;
    }
    if (!cue) return;
    if (audio.dataset.key === cue.key) {
      if (audio.paused && !audio.ended) void audio.play().catch(() => undefined);
      return;
    }
    audio.dataset.key = cue.key;
    audio.src = cue.audioUrl;
    audio.loop = false;
    void audio.play().catch(() => undefined);
  }, [cue, paused]);

  const begin = () => {
    const audio = voiceRef.current;
    const prime = view?.primeAudioUrl;
    const generation = unlock.current + 1;
    unlock.current = generation;
    if (audio && prime) {
      audio.muted = true;
      audio.src = prime;
      void audio
        .play()
        .then(() => {
          if (unlock.current !== generation || audio.dataset.line) return;
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          if (unlock.current === generation) audio.muted = false;
        });
    }
    socketRef.current?.send(JSON.stringify(startMessage()));
    setProblem(null);
  };

  const ambientLive = Boolean(view?.ambient.live && !view.ambient.suppressed);
  const cueLive = view?.playback?.cue?.effect === "pulse";
  const accentLive = Boolean(view?.ambient.accent);

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden">
      <div
        className="ambient-bed"
        data-testid="ambient-bed"
        data-live={ambientLive ? "true" : "false"}
        data-reason={view?.ambient.reason ?? ""}
      />
      <div className="cue-pulse" data-testid="cue-pulse" data-live={cueLive ? "true" : "false"} />
      <div
        className="accent-pulse"
        data-testid="accent-pulse"
        data-live={accentLive ? "true" : "false"}
      />
      {loadingAssets ? (
        <p
          data-testid="asset-loading"
          aria-live="polite"
          className="relative z-10 px-8 pt-4 text-lg text-amber-200/80"
        >
          Loading the scene…
        </p>
      ) : null}
      <header className="relative z-10 flex items-end justify-between gap-6 px-8 pt-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-amber-200/80">Night 2 · Sanctuary</p>
          <h1 className="text-[1.75rem] leading-tight">Burgomaster's Funeral</h1>
        </div>
        <p className="text-[1.75rem]">
          Skulls <span className="text-[3rem] leading-none">{view?.skulls ?? "unavailable"}</span>
        </p>
      </header>

      {view?.stage !== "scene" ? (
        <section className="relative z-10 grid min-h-0 flex-1 grid-cols-[auto_1fr] gap-10 px-8 py-6">
          <div className="flex w-full max-w-sm flex-col gap-4">
            <img
              src="/join/qr.svg"
              alt=""
              data-testid="join-qr"
              className="h-auto w-full bg-white p-2"
            />
            <p data-testid="join-code" className="text-[3rem] leading-none tracking-widest">
              {view?.join.code ?? "····"}
            </p>
            <p data-testid="join-url" className="max-w-sm break-all text-[1.75rem] leading-snug">
              {view?.join.url ?? "Waiting for the host"}
            </p>
          </div>
          <div className="flex min-h-0 flex-col gap-6">
            <ul className="grid grid-cols-2 gap-4">
              {(view?.roster ?? []).map((hunter) => (
                <li
                  key={hunter.hunter}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center gap-4"
                >
                  <img src={hunter.portraitUrl} alt="" className="h-auto w-full object-contain" />
                  <div>
                    <p className="text-[1.75rem]">{hunter.name}</p>
                    <p className="text-lg text-stone-300">
                      {hunter.held ? "Held" : "Not held"} · corruption unavailable
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p data-testid="unheld" className="text-[1.75rem]">
              {view == null
                ? "Waiting for the host."
                : view.gate.unheld.length
                  ? `Still to hold: ${view.gate.unheld.join(", ")}`
                  : "All four hunters are held."}
            </p>
            <button
              type="button"
              data-testid="begin"
              className="min-h-12 max-w-xs text-[1.75rem] disabled:opacity-40"
              disabled={!view?.gate.canBegin}
              onClick={begin}
            >
              Begin
            </button>
          </div>
        </section>
      ) : (
        <section className="relative z-10 min-h-0 flex-1 overflow-y-auto px-8 pb-8">
          <div className="flex min-h-full flex-col items-center justify-center gap-4">
            {view.playback?.stillUrl ? (
              <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                <img
                  src={view.playback.stillUrl}
                  alt=""
                  data-testid="moment-still"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
            {view.playback?.caption ? (
              <figure className="w-full max-w-4xl shrink-0 text-center">
                <figcaption data-testid="spoken-caption" className="text-[1.75rem] leading-snug">
                  <span className="text-amber-200/90">{view.playback.caption.speaker}. </span>
                  {view.playback.caption.text}
                </figcaption>
              </figure>
            ) : null}
            {view.choosing ? (
              <p data-testid="choosing" className="shrink-0 text-[1.75rem]">
                Choose on your device.
              </p>
            ) : null}
            {view.paused ? (
              <p className="shrink-0 text-[1.75rem]">
                Play is paused until every hunter has a connected device.
              </p>
            ) : null}
          </div>
        </section>
      )}

      {problem ? <p className="relative z-10 px-8 pb-4 text-lg text-amber-200">{problem}</p> : null}
      {/* The line, the moment's music, and the cue's fallback. The Mac plays all of them. */}
      {/* Captions are the on-screen script lines, not a separate track file. */}
      {/* biome-ignore lint/a11y/useMediaCaption: caption is the spoken line on screen */}
      <audio ref={voiceRef} data-testid="spoken-line" />
      {/* biome-ignore lint/a11y/useMediaCaption: plainchant has no spoken words */}
      <audio ref={musicRef} data-testid="moment-music" />
      {/* biome-ignore lint/a11y/useMediaCaption: the cue's screen pulse is the visible half */}
      <audio ref={cueRef} data-testid="cue-audio" />
      <span className="sr-only">{PROTOCOL_VERSION}</span>
    </main>
  );
}
