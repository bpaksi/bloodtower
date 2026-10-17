"use client";

import type { StoryboardState } from "bloodtower-protocols";
import { useEffect, useState } from "react";
import { waitingStoryboard } from "../../lib/boardView";
import { openSession, sessionUrl, storyboardHello } from "../../lib/session";
import { StoryBoard } from "./StoryBoard";

/** The story board for a live session. It has no controls. */
export function LiveBoard() {
  const [state, setState] = useState<StoryboardState>(waitingStoryboard());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const session = openSession({
      url: sessionUrl(window.location, process.env.NEXT_PUBLIC_WS_URL),
      hello: storyboardHello(),
      onLive: () => undefined,
      onWelcome: () => undefined,
      onStoryboard: (next) => {
        setNotice(null);
        setState(next);
      },
      onDevice: () => undefined,
      onError: (error) => setNotice(error.message),
    });
    return () => session.close();
  }, []);

  return (
    <>
      {notice ? (
        <p className="bt-board-notice" role="status">
          {notice}
        </p>
      ) : null}
      <StoryBoard state={state} />
    </>
  );
}
