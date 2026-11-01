"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BoardAudio, installBtAudioHook } from "./boardAudio.ts";
import type { Layers } from "./layers.ts";
import { type Channel, DEFAULT_LEVELS, type Levels, readLevels, writeLevels } from "./levels.ts";

/** Landing page and Story board. iPad routes (`/device`, `/join`) are not here. */
export const isStoryAudioRoute = (pathname: string): boolean => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return path === "/" || path === "/board";
};

let singleton: BoardAudio | null = null;

/** One player for the document. A remount reuses it, so a screen change cannot stop the bed. */
export const storyBoardAudio = (levels: Levels): BoardAudio => {
  if (!singleton) singleton = new BoardAudio(levels);
  return singleton;
};

/** Test isolation. Production never calls this. */
export const resetStoryBoardAudioForTests = (): void => {
  singleton = null;
};

export let storyAudioProviderRenders = 0;

/** Test isolation. Production never calls this. */
export const resetStoryAudioProviderRenders = (): void => {
  storyAudioProviderRenders = 0;
};

const OpenBoardContext = createContext<(() => void) | null>(null);

/** Opens `/board` without a new document when the shell provides it. */
export const useOpenBoard = (): (() => void) => {
  const open = useContext(OpenBoardContext);
  return (
    open ??
    (() => {
      window.location.assign("/board");
    })
  );
};

export function OpenBoard({ open, children }: { open: () => void; children: ReactNode }) {
  return <OpenBoardContext.Provider value={open}>{children}</OpenBoardContext.Provider>;
}

export interface StoryAudioApi {
  levels: Levels;
  reload: () => void;
  setLevel: (channel: Channel, level: number) => void;
  unlock: () => void;
  test: (channel: Channel) => void;
  update: (layers: Layers) => void;
}

const StoryAudioContext = createContext<StoryAudioApi | null>(null);

export const useStoryAudio = (): StoryAudioApi => {
  const api = useContext(StoryAudioContext);
  if (!api) throw new Error("Story audio is only on the landing page and the Story board.");
  return api;
};

function AudioProvider({ children }: { children: ReactNode }) {
  storyAudioProviderRenders += 1;
  const [levels, setLevels] = useState<Levels>(DEFAULT_LEVELS);
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  useEffect(() => {
    const saved = readLevels(window.localStorage);
    levelsRef.current = saved;
    setLevels(saved);
    const audio = storyBoardAudio(saved);
    audio.setLevels(saved);
    installBtAudioHook(audio);
  }, []);

  const api = useMemo<StoryAudioApi>(
    () => ({
      levels,
      reload: () => {
        const saved = readLevels(window.localStorage);
        levelsRef.current = saved;
        setLevels(saved);
        const audio = storyBoardAudio(saved);
        audio.setLevels(saved);
        installBtAudioHook(audio);
      },
      setLevel: (channel, level) => {
        const next = { ...levelsRef.current, [channel]: level };
        levelsRef.current = next;
        setLevels(next);
        writeLevels(window.localStorage, next);
        const audio = storyBoardAudio(next);
        audio.setLevels(next);
        installBtAudioHook(audio);
      },
      unlock: () => {
        const audio = storyBoardAudio(levelsRef.current);
        audio.setLevels(levelsRef.current);
        installBtAudioHook(audio);
        audio.unlock();
      },
      test: (channel) => {
        storyBoardAudio(levelsRef.current).test(channel);
      },
      update: (layers) => {
        storyBoardAudio(levelsRef.current).update(layers);
      },
    }),
    [levels],
  );

  return <StoryAudioContext.Provider value={api}>{children}</StoryAudioContext.Provider>;
}

/**
 * Mounts the shared player on the landing page and the Story board only.
 * `/device` and `/join` render their pages with no player.
 */
export function StoryAudioFrame({
  pathname,
  children,
}: {
  pathname: string;
  children?: ReactNode;
}) {
  if (!isStoryAudioRoute(pathname)) return children;
  return <AudioProvider>{children}</AudioProvider>;
}
