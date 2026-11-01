"use client";

import { type DeviceView, deviceViewPayloadSchema } from "bloodtower-protocols";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  pageLogContext,
  reconnectLog,
  reportPageLog,
  setPageLogContext,
  setPageLogSocket,
} from "../../lib/pageLog.ts";
import { WAKE_LOCK_REFUSED } from "../../lib/pageLogCodes.ts";
import {
  DEVICE_TOKEN_KEY,
  deviceHello,
  openSession,
  type SessionClient,
  sessionUrl,
} from "../../lib/session";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  type ScreenWakeSentinel,
  WAKE_LOCK_NOTICE,
  type WakeLockHost,
} from "../../lib/wakeLock.ts";
import {
  DeviceErrorBanner,
  type DeviceErrorBannerModel,
  liveDeviceBanner,
} from "../errors/DeviceErrorBanner.tsx";
import { CoreDeviceScreen } from "./CoreDeviceScreen";
import { detectFormFactor } from "./formFactor";

const WAKE_NOTICE_CSS = `
.bt-wake-slot { flex: 0 0 auto; }
.bt-wake-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 var(--bt-ipad-corner) 0.5rem;
  position: relative;
  z-index: 21;
}
.bt-wake-notice .bt-device-banner { flex: 1 1 auto; min-width: 0; }
.bt-wake-notice .bt-kicker {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.bt-wake-notice [data-action="dismiss-wake-notice"] {
  flex: 0 0 2.75rem;
  width: 2.75rem;
  min-width: 2.75rem;
  max-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
}
`;

const waiting = deviceViewPayloadSchema.parse({
  deviceId: "pending",
  screen: "pick-game",
  shows: "Joining…",
  heroes: [],
  actions: [],
});

const wakeHost = (): WakeLockHost => navigator as unknown as WakeLockHost;

const logWakeFailure = (code: string, message: string) => {
  const context = pageLogContext();
  void reportPageLog({
    level: "error",
    code,
    message,
    source: "device",
    device: context.device,
    screen: context.screen,
  });
};

/** The refused keep-awake notice, in the column above the bottom bar. */
function WakeNotice({
  code,
  message,
  onDismiss,
}: {
  code: string;
  message: string;
  onDismiss: () => void;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const main = document.querySelector("main.bt-device");
    const bar = main?.querySelector("[data-bottom-bar]");
    if (!main || !bar) return;
    const node = document.createElement("div");
    node.className = "bt-wake-slot";
    node.dataset.wakeSlot = "";
    main.insertBefore(node, bar);
    setSlot(node);
    return () => {
      node.remove();
    };
  }, []);
  if (!slot) return null;
  return createPortal(
    <div className="bt-wake-notice" data-wake-notice="">
      <DeviceErrorBanner code={code} message={message} />
      <button
        type="button"
        className="bt-ghost"
        aria-label="Dismiss"
        data-action="dismiss-wake-notice"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>,
    slot,
  );
}

/** The controls for a device that already joined. */
export function LiveDevice() {
  const [live, setLive] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [state, setState] = useState<DeviceView>(waiting);
  const [banner, setBanner] = useState<DeviceErrorBannerModel | null>(null);
  const [wakeNotice, setWakeNotice] = useState<{ code: string; message: string } | null>(null);
  const client = useRef<SessionClient | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const screenRef = useRef(state.screen);
  const hold = useRef<ScreenWakeSentinel | null>(null);
  const left = useRef(false);
  const mounted = useRef(true);
  const welcomed = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const askRef = useRef<(force: boolean) => void>(() => undefined);
  const letGoRef = useRef<() => void>(() => undefined);
  screenRef.current = state.screen;
  deviceIdRef.current = deviceId;

  letGoRef.current = () => {
    if (left.current) return;
    left.current = true;
    const current = hold.current;
    hold.current = null;
    void releaseScreenWakeLock(current).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      logWakeFailure(
        WAKE_LOCK_REFUSED,
        detail.trim() === "" ? "The screen wake lock could not be released." : detail,
      );
    });
  };

  askRef.current = (force: boolean) => {
    const run = async () => {
      if (left.current) return;
      if (!force && hold.current && !hold.current.released) return;
      const outcome = await requestScreenWakeLock(wakeHost());
      if (left.current || !mounted.current) {
        if (outcome.ok) {
          try {
            await releaseScreenWakeLock(outcome.sentinel);
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            logWakeFailure(
              WAKE_LOCK_REFUSED,
              detail.trim() === "" ? "The screen wake lock could not be released." : detail,
            );
          }
        }
        return;
      }
      if (!outcome.ok) {
        logWakeFailure(outcome.code, WAKE_LOCK_NOTICE);
        setWakeNotice({ code: outcome.code, message: WAKE_LOCK_NOTICE });
        return;
      }
      const previous = hold.current;
      const acquired = outcome.sentinel;
      hold.current = acquired;
      acquired.addEventListener?.("release", () => {
        if (hold.current === acquired) hold.current = null;
      });
      if (previous && previous !== acquired) {
        try {
          await releaseScreenWakeLock(previous);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          logWakeFailure(
            WAKE_LOCK_REFUSED,
            detail.trim() === "" ? "The screen wake lock could not be released." : detail,
          );
        }
      }
    };
    const job = chain.current.then(run);
    chain.current = job.catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      logWakeFailure(
        WAKE_LOCK_REFUSED,
        detail.trim() === "" ? "The screen wake lock failed." : detail,
      );
    });
  };

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
        if (welcome.role !== "device") return;
        setDeviceId(welcome.clientId);
        welcomed.current += 1;
        // The first welcome asks once. A later welcome is a reconnect: ask again
        // even if the previous sentinel is still held (DEC-712, host restart).
        askRef.current(welcomed.current > 1);
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

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      askRef.current(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (state.screen === "goodbye") letGoRef.current();
  }, [state.screen]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      letGoRef.current();
    };
  }, []);

  return (
    <>
      <style>{WAKE_NOTICE_CSS}</style>
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
      {wakeNotice ? (
        <WakeNotice
          code={wakeNotice.code}
          message={wakeNotice.message}
          onDismiss={() => setWakeNotice(null)}
        />
      ) : null}
    </>
  );
}
