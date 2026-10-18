"use client";

import type { FlowScreen, StoryboardState } from "bloodtower-protocols";
import { useEffect, useRef, useState } from "react";
import { BoardAudio } from "../../lib/audio/boardAudio.ts";
import { isBeforePickGame, isGameChosen, pickLayers } from "../../lib/audio/layers.ts";
import {
  type Channel,
  DEFAULT_LEVELS,
  type Levels,
  readLevels,
  writeLevels,
} from "../../lib/audio/levels.ts";
import { SIGNATURE } from "../../lib/audio/tracks.ts";
import { waitingStoryboard } from "../../lib/boardView";
import { openSession, type SessionClient, sessionUrl, storyboardHello } from "../../lib/session";
import { SoundDialog } from "./SoundDialog";
import { StoryBoard } from "./StoryBoard";

/** localStorage can throw in a private window or with blocked site data. */
const localStore = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/** The story board for a live session. It has no controls, except the Sound dialog (R3-UI-03). */
export function LiveBoard() {
  const [state, setState] = useState<StoryboardState>(waitingStoryboard());
  const [notice, setNotice] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [levels, setLevels] = useState<Levels>(DEFAULT_LEVELS);
  const [soundOpen, setSoundOpen] = useState(false);
  const client = useRef<SessionClient | null>(null);
  const audio = useRef<BoardAudio | null>(null);
  const screen = useRef<FlowScreen>(state.screen);
  const lastScreen = useRef<FlowScreen | null>(null);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
    const saved = readLevels(localStore());
    setLevels(saved);
    audio.current = new BoardAudio(saved);
    const session = openSession({
      url: sessionUrl(window.location, process.env.NEXT_PUBLIC_WS_URL),
      hello: storyboardHello(),
      onLive: () => undefined,
      onWelcome: () => undefined,
      onStoryboard: (next) => {
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
      onError: (error) => setNotice(error.message),
    });
    client.current = session;
    return () => session.close();
  }, []);

  // The first click or keypress unlocks audio, plays the landing sting, and (before Pick Game)
  // opens the Sound dialog. Listeners go once the audio is unlocked.
  useEffect(() => {
    const onFirstInput = () => {
      window.removeEventListener("pointerdown", onFirstInput);
      window.removeEventListener("keydown", onFirstInput);
      const player = audio.current;
      if (!player) return;
      player.unlock();
      player.play(SIGNATURE.sting, "music", 6.5);
      if (isBeforePickGame(screen.current)) setSoundOpen(true);
    };
    window.addEventListener("pointerdown", onFirstInput);
    window.addEventListener("keydown", onFirstInput);
    return () => {
      window.removeEventListener("pointerdown", onFirstInput);
      window.removeEventListener("keydown", onFirstInput);
    };
  }, []);

  const visual = state.moment !== null;
  useEffect(() => {
    screen.current = state.screen;
    audio.current?.update(
      pickLayers({ screen: state.screen, packId: state.packId ?? null, visual }),
    );
    const from = lastScreen.current;
    lastScreen.current = state.screen;
    if (from !== null && isGameChosen(from, state.screen)) {
      audio.current?.play(SIGNATURE.soft, "music", 6.5);
    }
  }, [state.screen, state.packId, visual]);

  const onLevelChange = (channel: Channel, level: number) => {
    const next = { ...levels, [channel]: level };
    setLevels(next);
    audio.current?.setLevels(next);
    writeLevels(localStore(), next);
  };

  return (
    <>
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
