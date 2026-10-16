"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEVICE_TOKEN_KEY,
  deviceHello,
  forgetStoredToken,
  openSession,
  type SessionClient,
  sessionUrl,
} from "../../lib/session";
import { detectFormFactor } from "./formFactor";
import { type JoinHunter, JoinScreen } from "./JoinScreen";

const codeFromLocation = () => {
  const value = new URLSearchParams(window.location.search).get("code");
  return value && /^\d{6}$/.test(value) ? value : null;
};

/** Join, holdings and the rejoin token. Presses go to the session host. */
export function LiveJoin() {
  const [live, setLive] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [hunters, setHunters] = useState<JoinHunter[]>([]);
  const [held, setHeld] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const client = useRef<SessionClient | null>(null);

  useEffect(() => {
    const urlCode = codeFromLocation();
    setCode(urlCode);
    const stored = sessionStorage.getItem(DEVICE_TOKEN_KEY);
    const formFactor = detectFormFactor(navigator.userAgent);
    let hello: ReturnType<typeof deviceHello> | null = null;
    if (stored) {
      try {
        hello = deviceHello({ formFactor, token: stored });
      } catch {
        sessionStorage.removeItem(DEVICE_TOKEN_KEY);
      }
    }
    if (!hello && urlCode) {
      try {
        hello = deviceHello({ formFactor, joinCode: urlCode });
      } catch {
        hello = null;
      }
    }
    if (!hello) return;
    let welcomed = false;
    const session = openSession({
      url: sessionUrl(window.location, process.env.NEXT_PUBLIC_WS_URL),
      hello,
      onLive: setLive,
      onWelcome: (welcome) => {
        if (welcome.role !== "device") return;
        welcomed = true;
        sessionStorage.setItem(DEVICE_TOKEN_KEY, welcome.token);
        setToken(welcome.token);
      },
      onStoryboard: () => undefined,
      onDevice: (state) => {
        setHeld(state.heldHunters);
        if (state.roster) setHunters(state.roster);
        setNotice(null);
      },
      onError: (error) => {
        setNotice(error.message);
        if (!forgetStoredToken({ hadStoredToken: stored !== null, welcomed, code: error.code })) {
          return;
        }
        sessionStorage.removeItem(DEVICE_TOKEN_KEY);
        if (urlCode) window.location.reload();
      },
    });
    client.current = session;
    return () => session.close();
  }, []);

  return (
    <>
      <JoinScreen
        live={live}
        code={code}
        hunters={hunters}
        held={held}
        onHold={(hunter, action) => {
          client.current?.sendHold(hunter, action);
        }}
        onRejoin={(next) => {
          sessionStorage.setItem(DEVICE_TOKEN_KEY, next);
          window.location.assign("/join");
        }}
      />
      {token ? <p>Device token {token}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      <p>
        <a href="/device">Open controls</a>
      </p>
    </>
  );
}
