"use client";

import type { FlowScreen, StoryboardState } from "bloodtower-protocols";
import { useEffect, useRef, useState } from "react";
import { BoardAudio } from "../../lib/audio/boardAudio.ts";
import {
  audioPackId,
  duckLevel,
  isGameChosen,
  isLanding,
  isVisualMoment,
  pickLayers,
} from "../../lib/audio/layers.ts";
import {
  type Channel,
  DEFAULT_LEVELS,
  type Levels,
  readLevels,
  writeLevels,
} from "../../lib/audio/levels.ts";
import { SIGNATURE } from "../../lib/audio/tracks.ts";
import { waitingStoryboard } from "../../lib/boardView";
import { type ErrorToast, pushErrorToast, visibleErrorToasts } from "../../lib/errorToasts.ts";
import {
  pageLogContext,
  reconnectLog,
  reportPageLog,
  setPageLogContext,
  setPageLogSocket,
} from "../../lib/pageLog.ts";
import { openSession, type SessionClient, sessionUrl, storyboardHello } from "../../lib/session";
import { SoundDialog } from "./SoundDialog";
import { StoryBoard } from "./StoryBoard";
import { StoryToasts } from "./StoryToasts.tsx";

/** localStorage can throw in a private window or with blocked site data. */
const localStore = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch (error) {
    // A private window refuses site storage. Levels fall back to the defaults, so this is recovered.
    const detail = error instanceof Error ? error.message : String(error);
    void reportPageLog({
      level: "debug",
      code: "board-storage",
      message: detail.trim() === "" ? "Site storage is unavailable." : detail,
      source: "board",
    });
    return undefined;
  }
};

/** After the first input on the landing: the sting, and the Sound dialog before a game is picked. */
const afterFirstInput = (current: FlowScreen, player: BoardAudio | null, openSound: () => void) => {
  if (isLanding(current)) player?.play(SIGNATURE.sting, "music", 6.5);
  if (isLanding(current)) openSound();
};

/** The story board for a live session. It has no controls, except the Sound dialog (R3-UI-03). */
export function LiveBoard() {
  const [state, setState] = useState<StoryboardState>(waitingStoryboard());
  const [notice, setNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ErrorToast[]>([]);
  const [debug, setDebug] = useState(false);
  const [levels, setLevels] = useState<Levels>(DEFAULT_LEVELS);
  const [soundOpen, setSoundOpen] = useState(false);
  const client = useRef<SessionClient | null>(null);
  const audio = useRef<BoardAudio | null>(null);
  const screen = useRef<FlowScreen>(state.screen);
  const lastScreen = useRef<FlowScreen | null>(null);
  /** False until the session sends its first state, so a reload mid-game is not taken for the landing. */
  const received = useRef(false);
  /** The first input came before the first state; decide on the sting and dialog when it lands. */
  const inputBeforeState = useRef(false);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
    const saved = readLevels(localStore());
    setLevels(saved);
    audio.current = new BoardAudio(saved);
    const clearContext = setPageLogContext(() => ({
      source: "board",
      device: null,
      session: null,
      screen: screen.current,
    }));
    const clearSocket = setPageLogSocket((entry) => client.current?.sendLog(entry) ?? false);
    const session = openSession({
      url: sessionUrl(window.location, process.env.NEXT_PUBLIC_WS_URL),
      hello: storyboardHello(),
      onLive: () => undefined,
      onWelcome: () => undefined,
      onReconnect: () => {
        void reportPageLog({ ...reconnectLog(), source: "board" });
      },
      onLogged: (entry) => {
        const now = Date.now();
        setToasts((current) => pushErrorToast(visibleErrorToasts(current, now), entry, now));
      },
      onStoryboard: (next) => {
        received.current = true;
        screen.current = next.screen;
        if (inputBeforeState.current) {
          inputBeforeState.current = false;
          afterFirstInput(next.screen, audio.current, () => setSoundOpen(true));
        }
        setNotice(null);
        setState(next);
        if (next.moment) {
          console.info("[bloodtower] storyboard moment assets", {
            still: next.moment.still,
            fallbackAudio: next.moment.fallbackAudio,
          });
        }
      },
      onDevice: () => undefined,
      onError: (error) => setNotice(`${error.code}: ${error.message}`),
      onLocalError: (error) => {
        const context = pageLogContext();
        void reportPageLog({
          level: "error",
          code: error.code,
          message: error.message,
          source: "board",
          screen: context.screen,
        });
        setNotice(`${error.code}: ${error.message}`);
      },
    });
    client.current = session;
    return () => {
      session.close();
      clearSocket();
      clearContext();
    };
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const delay = Math.max(0, Math.min(...toasts.map((toast) => toast.until - Date.now())));
    const timer = setTimeout(() => {
      setToasts((current) => visibleErrorToasts(current, Date.now()));
    }, delay);
    return () => clearTimeout(timer);
  }, [toasts]);

  // The first click or keypress unlocks audio. On the landing it is the moment the window
  // lights come on, so it plays the sting and opens the Sound dialog.
  // A key such as Escape is not a user activation and leaves the context suspended, so every
  // input resumes it, and the listeners go only once the audio is running.
  useEffect(() => {
    let first = true;
    const onInput = () => {
      const player = audio.current;
      if (!player) return;
      if (player.running) {
        window.removeEventListener("pointerdown", onInput);
        window.removeEventListener("keydown", onInput);
        return;
      }
      player.unlock();
      if (!first) return;
      first = false;
      if (received.current) afterFirstInput(screen.current, player, () => setSoundOpen(true));
      else inputBeforeState.current = true;
    };
    window.addEventListener("pointerdown", onInput);
    window.addEventListener("keydown", onInput);
    return () => {
      window.removeEventListener("pointerdown", onInput);
      window.removeEventListener("keydown", onInput);
    };
  }, []);

  const visual = state.screen === "play" && isVisualMoment(state.moment);
  const soundPack = audioPackId(state);
  useEffect(() => {
    screen.current = state.screen;
    audio.current?.update(pickLayers({ screen: state.screen, packId: soundPack, visual }));
    const from = lastScreen.current;
    lastScreen.current = state.screen;
    if (from !== null && isGameChosen(from, state.screen)) {
      audio.current?.play(SIGNATURE.soft, "music", 6.5);
    }
  }, [state.screen, soundPack, visual]);

  const duck = duckLevel(state.volumeTest);
  useEffect(() => {
    audio.current?.setDuck(duck);
  }, [duck]);

  const onLevelChange = (channel: Channel, level: number) => {
    const next = { ...levels, [channel]: level };
    setLevels(next);
    audio.current?.setLevels(next);
    writeLevels(localStore(), next);
  };

  return (
    <>
      <StoryToasts toasts={toasts} />
      {notice ? (
        <p className="bt-board-notice" role="status">
          {notice}
        </p>
      ) : null}
      <StoryBoard
        state={state}
        debug={debug}
        onKeeperLineEnded={(momentId, line) => {
          client.current?.sendKeeperLineEnded(momentId, line);
        }}
      />
      {soundOpen ? (
        <SoundDialog
          levels={levels}
          onLevelChange={onLevelChange}
          onTest={(channel) => audio.current?.test(channel)}
          onContinue={() => setSoundOpen(false)}
        />
      ) : null}
    </>
  );
}
