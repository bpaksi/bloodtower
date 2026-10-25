"use client";

import { type DeviceView, deviceViewPayloadSchema } from "bloodtower-protocols";
import { useEffect, useRef, useState } from "react";
import {
  pageLogContext,
  reconnectLog,
  reportPageLog,
  setPageLogContext,
  setPageLogSocket,
} from "../../lib/pageLog.ts";
import {
  DEVICE_TOKEN_KEY,
  deviceHello,
  openSession,
  type SessionClient,
  sessionUrl,
} from "../../lib/session";
import { type DeviceErrorBannerModel, liveDeviceBanner } from "../errors/DeviceErrorBanner.tsx";
import { CoreDeviceScreen } from "./CoreDeviceScreen";
import { detectFormFactor } from "./formFactor";

const waiting = deviceViewPayloadSchema.parse({
  deviceId: "pending",
  screen: "pick-game",
  shows: "Joining…",
  heroes: [],
  actions: [],
});

/** The controls for a device that already joined. */
export function LiveDevice() {
  const [live, setLive] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [state, setState] = useState<DeviceView>(waiting);
  const [banner, setBanner] = useState<DeviceErrorBannerModel | null>(null);
  const client = useRef<SessionClient | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const screenRef = useRef(state.screen);
  screenRef.current = state.screen;
  deviceIdRef.current = deviceId;

  useEffect(() => {
    const clearContext = setPageLogContext(() => ({
      source: "device",
      device: deviceIdRef.current,
      session: null,
      screen: screenRef.current,
    }));
    const clearSocket = setPageLogSocket((entry) => client.current?.sendLog(entry) ?? false);
    const token = sessionStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token)
      return () => {
        clearSocket();
        clearContext();
      };
    let hello: ReturnType<typeof deviceHello>;
    try {
      hello = deviceHello({ formFactor: detectFormFactor(navigator.userAgent), token });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const message = detail.trim() === "" ? "The device hello was refused." : detail;
      void reportPageLog({
        level: "error",
        code: "device-hello",
        message,
        source: "device",
        screen: "device",
      });
      setBanner(liveDeviceBanner({ code: "device-hello", message }));
      return () => {
        clearSocket();
        clearContext();
      };
    }
    const session = openSession({
      url: sessionUrl(window.location, process.env.NEXT_PUBLIC_WS_URL),
      hello,
      onLive: setLive,
      onWelcome: (welcome) => {
        if (welcome.role === "device") setDeviceId(welcome.clientId);
      },
      onBoardView: () => undefined,
      onDeviceView: (next) => {
        if (screenRef.current !== next.screen) setBanner(null);
        setState(next);
      },
      onError: (error) => setBanner(liveDeviceBanner(error)),
      onLocalError: (error) => {
        const context = pageLogContext();
        void reportPageLog({
          level: "error",
          code: error.code,
          message: error.message,
          source: "device",
          device: context.device,
          screen: context.screen,
        });
        setBanner(liveDeviceBanner(error));
      },
      onReconnect: () => {
        void reportPageLog(reconnectLog());
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
      <CoreDeviceScreen
        live={live}
        view={state}
        errorBanner={banner}
        onAct={(promptId, actionId, args) => {
          client.current?.sendAct(promptId, actionId, args);
        }}
        onHold={(heroId, action) => {
          client.current?.sendHold(heroId, action);
        }}
      />
    </>
  );
}
