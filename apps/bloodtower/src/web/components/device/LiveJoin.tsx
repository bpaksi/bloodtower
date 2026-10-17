"use client";

import { useEffect, useState } from "react";
import {
  DEVICE_TOKEN_KEY,
  deviceHello,
  forgetStoredToken,
  openSession,
  sessionUrl,
} from "../../lib/session";
import { detectFormFactor } from "./formFactor";
import { JoinScreen } from "./JoinScreen";

const codeFromLocation = () => {
  const value = new URLSearchParams(window.location.search).get("code");
  return value && /^\d{6}$/.test(value) ? value : null;
};

const enterDevice = () => {
  window.location.assign("/device");
};

/** Join and rejoin. Once welcomed, the iPad enters Tower Connect. */
export function LiveJoin() {
  const [live, setLive] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
        enterDevice();
      },
      onStoryboard: () => undefined,
      onDevice: () => {
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
    return () => session.close();
  }, []);

  return (
    <>
      <JoinScreen
        live={live}
        code={code}
        onRejoin={(next) => {
          sessionStorage.setItem(DEVICE_TOKEN_KEY, next);
          enterDevice();
        }}
      />
      {notice ? <p role="status">{notice}</p> : null}
    </>
  );
}
