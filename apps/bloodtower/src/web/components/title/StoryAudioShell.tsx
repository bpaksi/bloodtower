"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { isStoryAudioRoute, OpenBoard, StoryAudioFrame } from "../../lib/audio/storyAudio.tsx";
import { LiveBoard } from "../board/LiveBoard.tsx";

const isBoardPath = (pathname: string) => pathname === "/board" || pathname.startsWith("/board/");

/**
 * Keeps one audio player from `/` onto `/board`. The URL changes with `history.pushState`,
 * so the document (and its audio context) stays. Next's pathname follows that push, but the
 * page slot does not, so the shell draws the board itself. `/device` and `/join` do not mount it.
 */
export function StoryAudioShell({ children }: { children: ReactNode }) {
  const nextPath = usePathname() ?? "";
  const loadedPath = useRef(nextPath);
  const loadedBoard = isBoardPath(loadedPath.current);
  const [path, setPath] = useState(nextPath);
  const [overrideBoard, setOverrideBoard] = useState(false);

  useEffect(() => {
    const onPop = () => {
      const next = window.location.pathname;
      setPath(next);
      setOverrideBoard(isBoardPath(next));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openBoard = useCallback(() => {
    if (window.location.pathname !== "/board") {
      window.history.pushState({ btStory: "board" }, "", "/board");
    }
    setPath("/board");
    setOverrideBoard(true);
  }, []);

  const story = isStoryAudioRoute(path) || overrideBoard || loadedBoard;
  if (!story) return children;

  const showBoard = overrideBoard || loadedBoard || isBoardPath(path);

  return (
    <OpenBoard open={openBoard}>
      <StoryAudioFrame pathname={showBoard ? "/board" : path}>
        {showBoard && !loadedBoard ? <LiveBoard /> : children}
      </StoryAudioFrame>
    </OpenBoard>
  );
}
