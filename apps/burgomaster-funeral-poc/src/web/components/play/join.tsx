"use client";

import { type HunterId, PROTOCOL_VERSION } from "burgomaster-funeral-poc-protocols";
import { useEffect, useRef, useState } from "react";
import { deviceFormFactor, helloDevice, holdMessage, pickMessage, socketUrl } from "@/lib/messages";
import { fetchPreloadList, loadAsset, preloadScene } from "@/lib/preload";
import { type DeviceView, isDeviceView, isHunterList, type PublicHunter } from "@/lib/view";

const TOKEN_KEY = "funeral.device.token";

export function JoinScreen() {
  const [hunters, setHunters] = useState<PublicHunter[]>([]);
  const [view, setView] = useState<DeviceView | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [active, setActive] = useState<HunterId | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const revision = useRef(0);
  const findingAudio = useRef<HTMLAudioElement | null>(null);
  const playedFinding = useRef<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode(params.get("code"));
    void fetch("/hunters")
      .then((response) => response.json())
      .then((body: unknown) => {
        if (isHunterList(body)) setHunters(body);
      })
      .catch(() => setProblem("The hunter list did not load."));
  }, []);

  useEffect(() => {
    if (code === null || attempt > 2) return;
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
      if (closed || !isDeviceView(body) || body.revision < revision.current) return;
      revision.current = body.revision;
      setView(body);
      setActive((current) => current ?? body.held[0]?.hunter ?? null);
    };
    socket.addEventListener("open", () => {
      const saved = sessionStorage.getItem(TOKEN_KEY);
      const formFactor = deviceFormFactor(window.innerWidth);
      const hello = saved
        ? helloDevice(formFactor, undefined, saved)
        : code
          ? helloDevice(formFactor, code)
          : null;
      if (!hello) {
        setProblem("Open the link from the Dashboard.");
        return;
      }
      socket.send(JSON.stringify(hello));
    });
    socket.addEventListener("message", (event) => {
      let message: {
        type?: string;
        payload?: { token?: string; clientId?: string; message?: string };
      };
      try {
        message = JSON.parse(String(event.data)) as typeof message;
      } catch {
        return;
      }
      if (message.type === "welcome" && message.payload?.token) {
        const token = message.payload.token;
        tokenRef.current = token;
        sessionStorage.setItem(TOKEN_KEY, token);
        if (message.payload.clientId) setDeviceId(message.payload.clientId);
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
      if (message.type === "error" && message.payload?.message) {
        setProblem(message.payload.message);
        if (message.payload.message.includes("join again")) {
          sessionStorage.removeItem(TOKEN_KEY);
          tokenRef.current = null;
          if (!closed) setAttempt((current) => current + 1);
        }
      }
      const token = tokenRef.current;
      if (token) void refresh(token);
    });
    return () => {
      closed = true;
      socket.close();
    };
  }, [code, attempt]);

  const send = (message: unknown) => {
    socketRef.current?.send(JSON.stringify(message));
  };

  const take = (hunter: HunterId) => {
    if (!deviceId) return;
    const holding = view?.held.some((item) => item.hunter === hunter) ?? false;
    send(holdMessage(deviceId, hunter, holding ? "release" : "take"));
  };

  const takeAll = () => {
    if (!deviceId) return;
    for (const hunter of hunters) send(holdMessage(deviceId, hunter.hunter, "take"));
  };

  const heldIds = new Set(view?.held.map((item) => item.hunter) ?? []);
  const shown = active ?? view?.held[0]?.hunter ?? null;
  const finding = view?.findings.find((item) => item.hunter === shown);

  useEffect(() => {
    const audio = findingAudio.current;
    if (!audio || !finding) return;
    if (playedFinding.current === finding.momentId) return;
    playedFinding.current = finding.momentId;
    audio.src = finding.audioUrl;
    void audio.play().catch(() => setNeedsPlay(true));
  }, [finding]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6">
      <header>
        <p className="text-sm uppercase tracking-widest text-amber-200/80">Your device</p>
        <h1 className="text-3xl">Hunters</h1>
      </header>

      {loadingAssets ? (
        <p data-testid="asset-loading" aria-live="polite" className="text-lg text-amber-200/80">
          Loading the scene…
        </p>
      ) : null}
      {problem ? <p className="text-lg text-amber-200">{problem}</p> : null}
      {view?.paused ? <p className="text-lg">Play is paused.</p> : null}

      {!view?.choosing && !finding ? (
        <section className="flex flex-col gap-4">
          <button
            type="button"
            className="min-h-11 text-left text-xl"
            data-testid="take-all"
            disabled={!deviceId || hunters.length < 4}
            onClick={takeAll}
          >
            Take all four
          </button>
          <ul className="flex flex-col gap-3">
            {hunters.map((hunter) => (
              <li key={hunter.hunter}>
                <button
                  type="button"
                  className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-4 text-left text-xl"
                  disabled={!deviceId}
                  onClick={() => take(hunter.hunter)}
                >
                  <img src={hunter.portraitUrl} alt="" className="h-auto w-full object-contain" />
                  <span>
                    {heldIds.has(hunter.hunter) ? "Release" : "Take"} {hunter.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {view && view.held.length > 0 ? (
            <p className="text-lg text-stone-300">
              You hold {view.held.map((item) => item.name).join(", ")}. The funeral plays on the
              shared screen. Corruption is unavailable.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {view?.held.map((hunter) => (
              <button
                key={hunter.hunter}
                type="button"
                className="min-h-11 px-3 text-lg"
                aria-pressed={shown === hunter.hunter}
                onClick={() => setActive(hunter.hunter)}
              >
                {hunter.name}
              </button>
            ))}
          </div>
          {finding ? (
            <figure className="flex flex-col gap-3" data-testid="finding">
              <img
                src={finding.stillUrl}
                alt=""
                data-testid="finding-still"
                className="h-auto max-w-full object-contain"
              />
              <figcaption data-testid="finding-text" className="text-xl leading-snug">
                {finding.name}. {finding.text}
              </figcaption>
              {/* biome-ignore lint/a11y/useMediaCaption: the finding text above is the caption */}
              <audio ref={findingAudio} data-testid="finding-audio" />
              {needsPlay ? (
                <button
                  type="button"
                  className="min-h-11 text-left text-xl"
                  onClick={() => {
                    void findingAudio.current?.play().then(() => setNeedsPlay(false));
                  }}
                >
                  Play the line
                </button>
              ) : null}
            </figure>
          ) : (
            <ul className="flex flex-col gap-3">
              {view?.cards.map((card) => (
                <li key={card.action}>
                  <button
                    type="button"
                    className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-4 text-left text-lg disabled:opacity-40"
                    disabled={card.taken || !shown}
                    onClick={() => {
                      if (shown) send(pickMessage(shown, card.action));
                    }}
                  >
                    <img src={card.imageUrl} alt="" className="h-auto w-full object-contain" />
                    <span>{card.taken ? `Taken. ${card.text}` : card.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <span className="sr-only">{PROTOCOL_VERSION}</span>
    </main>
  );
}
