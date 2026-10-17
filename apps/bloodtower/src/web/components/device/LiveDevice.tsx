"use client";

import {
  type DeviceState,
  deviceStatePayloadSchema,
  type TowerSnapshot,
} from "bloodtower-protocols";
import { useEffect, useRef, useState } from "react";
import {
  DEVICE_TOKEN_KEY,
  deviceHello,
  openSession,
  type SessionClient,
  sessionUrl,
} from "../../lib/session";
import { DeviceScreen } from "./DeviceScreen";
import { detectFormFactor } from "./formFactor";

const waiting = deviceStatePayloadSchema.parse({
  screen: "splash",
  heldHunters: [],
  views: [],
  prompt: null,
  lock: null,
  won: null,
});

const unavailable: TowerSnapshot = {
  connection: "unavailable",
  battery: { state: "unavailable" },
  calibrated: { state: "unavailable" },
};

/** The controls for a device that already joined. A missing token stays on the waiting screen. */
export function LiveDevice() {
  const [live, setLive] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [state, setState] = useState<DeviceState>(waiting);
  const client = useRef<SessionClient | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) return;
    let hello: ReturnType<typeof deviceHello>;
    try {
      hello = deviceHello({ formFactor: detectFormFactor(navigator.userAgent), token });
    } catch {
      return;
    }
    const session = openSession({
      url: sessionUrl(window.location, process.env.NEXT_PUBLIC_WS_URL),
      hello,
      onLive: setLive,
      onWelcome: (welcome) => {
        if (welcome.role === "device") setDeviceId(welcome.clientId);
      },
      onStoryboard: () => undefined,
      onDevice: setState,
      onError: () => undefined,
    });
    client.current = session;
    return () => session.close();
  }, []);

  return (
    <>
      <DeviceScreen
        live={live}
        deviceId={deviceId}
        state={state}
        pausePromptId={state.pausePromptId ?? null}
        connectLock={state.connectLock ?? null}
        calibrateLock={state.calibrateLock ?? null}
        tower={state.tower ?? unavailable}
        onControl={(promptId, action) => {
          client.current?.sendControl(promptId, action);
        }}
        onHold={(hunter, action) => {
          client.current?.sendHold(hunter, action);
        }}
      />
      <p className="px-6 pb-8 text-[var(--bt-muted)]">
        <a href="/join">Back to join</a>
      </p>
    </>
  );
}
