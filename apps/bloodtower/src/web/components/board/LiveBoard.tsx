"use client";

import type { FlowScreen, StoryboardState } from "bloodtower-protocols";
import { useEffect, useRef, useState } from "react";
import { BoardAudio } from "../../lib/audio/boardAudio.ts";
import {
  audioPackId,
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

/** After the first input on the landing: the sting, and the Sound dialog before a game is picked. */
const afterFirstInput = (current: FlowScreen, player: BoardAudio | null, openSound: () => void) => {
  if (isLanding(current)) player?.play(SIGNATURE.sting, "music", 6.5);
  if (isLanding(current)) openSound();
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
  /** False until the session sends its first state, so a reload mid-game is not taken for the landing. */
  const received = useRef(false);
  /** The first input came before the first state; decide on the sting and dialog when it lands. */
  const inputBeforeState = useRef(false);

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
      onError: (error) => setNotice(error.message),
    });
    client.current = session;
    return () => session.close();
  }, []);

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
