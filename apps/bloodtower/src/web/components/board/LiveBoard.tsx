"use client";

import type { BoardView, ViewScreen } from "bloodtower-protocols";
import { useEffect, useRef, useState } from "react";
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
import { CoreStoryBoard } from "./CoreStoryBoard";
import { StoryToasts } from "./StoryToasts.tsx";

/** The story board for a live session. Display only (protocol v2 `boardView`). */
export function LiveBoard() {
  const [state, setState] = useState<BoardView>(waitingStoryboard());
  const [notice, setNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ErrorToast[]>([]);
  const [debug, setDebug] = useState(false);
  const client = useRef<SessionClient | null>(null);
  const screen = useRef<ViewScreen>(state.screen);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
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
      onBoardView: (next) => {
        screen.current = next.screen;
        setNotice(null);
        setState(next);
      },
      onDeviceView: () => undefined,
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

  return (
    <>
      <StoryToasts toasts={toasts} />
      {notice ? (
        <p className="bt-board-notice" role="status">
          {notice}
        </p>
      ) : null}
      <CoreStoryBoard view={state} debug={debug} />
    </>
  );
}
