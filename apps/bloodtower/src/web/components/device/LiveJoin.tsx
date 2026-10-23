"use client";

import { useEffect, useState } from "react";
import {
  reconnectLog,
  reportPageLog,
  setPageLogContext,
  setPageLogSocket,
} from "../../lib/pageLog.ts";
import {
  DEVICE_TOKEN_KEY,
  deviceHello,
  forgetStoredToken,
  openSession,
  type SessionClient,
  sessionUrl,
} from "../../lib/session";
import { DeviceErrorBanner } from "../errors/DeviceErrorBanner.tsx";
import { detectFormFactor } from "./formFactor";
import { JoinScreen } from "./JoinScreen";

const codeFromLocation = () => {
  const value = new URLSearchParams(window.location.search).get("code");
  return value && /^\d{6}$/.test(value) ? value : null;
};

const enterDevice = () => {
  window.location.assign("/device");
};

/** The join page's error bar. Same banner as LiveDevice: the code, and no Reload. */
export function JoinErrorBar({ error }: { error: { code: string; message: string } | null }) {
  if (!error) return null;
  return <DeviceErrorBanner code={error.code} message={error.message} />;
}

/** Join and rejoin. Once welcomed, the iPad enters Tower Connect. */
export function LiveJoin() {
  const [live, setLive] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ code: string; message: string } | null>(null);
  useEffect(() => {
    const urlCode = codeFromLocation();
    setCode(urlCode);
    const stored = sessionStorage.getItem(DEVICE_TOKEN_KEY);
    const formFactor = detectFormFactor(navigator.userAgent);
    let hello: ReturnType<typeof deviceHello> | null = null;
    if (stored) {
      try {
        hello = deviceHello({ formFactor, token: stored });
      } catch (error) {
        sessionStorage.removeItem(DEVICE_TOKEN_KEY);
        const detail = error instanceof Error ? error.message : String(error);
        void reportPageLog({
          level: "debug",
          code: "device-hello",
          message:
            detail.trim() === ""
              ? "A stored device token was refused. Joining again."
              : `A stored device token was refused. Joining again. ${detail}`,
          source: "device",
          screen: "join",
        });
      }
    }
    if (!hello && urlCode) {
      try {
        hello = deviceHello({ formFactor, joinCode: urlCode });
      } catch (error) {
        hello = null;
        const detail = error instanceof Error ? error.message : String(error);
        void reportPageLog({
          level: "error",
          code: "device-hello",
          message: detail.trim() === "" ? "The join code was refused." : detail,
          source: "device",
          screen: "join",
        });
      }
    }
    const client: { current: SessionClient | null } = { current: null };
    const clearContext = setPageLogContext(() => ({
      source: "device",
      device: null,
      session: null,
      screen: "join",
    }));
    const clearSocket = setPageLogSocket((entry) => client.current?.sendLog(entry) ?? false);
    if (!hello) {
      return () => {
        clearSocket();
        clearContext();
      };
    }
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
      onReconnect: () => {
        void reportPageLog({ ...reconnectLog(), source: "device", screen: "join" });
      },
      onError: (error) => {
        setNotice({ code: error.code, message: error.message });
        if (!forgetStoredToken({ hadStoredToken: stored !== null, welcomed, code: error.code })) {
          return;
        }
        sessionStorage.removeItem(DEVICE_TOKEN_KEY);
        if (urlCode) window.location.reload();
      },
      onLocalError: (error) => {
        setNotice({ code: error.code, message: error.message });
        void reportPageLog({
          level: "error",
          code: error.code,
          message: error.message,
          source: "device",
          screen: "join",
        });
      },
    });
    client.current = session;
    return () => {
      session.close();
      clearSocket();
      clearContext();
    };
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
      <JoinErrorBar error={notice} />
    </>
  );
}
