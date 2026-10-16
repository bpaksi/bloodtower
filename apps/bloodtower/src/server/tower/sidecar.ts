import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { TowerSnapshot } from "bloodtower-protocols";
import { WebSocket } from "ws";
import { mapBattery, mapCalibration, mapConnection, unavailableTower } from "./snapshot.ts";
import type { TowerPort, TowerSent } from "./types.ts";

/** tower-poc's socket. This process does not start tower-poc. */
export const DEFAULT_SIDECAR_URL = "ws://127.0.0.1:4747/ws";

const OUTBOUND = new Set(["hello", "connect", "calibrate"]);

export interface SidecarOptions {
  url: string;
  /** Set for a hardware session. Lines are `{ at, dir, type }` with no payload. */
  diagLogPath?: string;
}

const diag = (path: string | undefined, dir: "in" | "out", type: string) => {
  if (!path) return;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), dir, type })}\n`);
};

/**
 * A client of tower-poc. The socket stays closed until `connect()`.
 * A dropped socket is not reopened. Calibrate is sent only while the tower is connected.
 * Outbound types are hello, connect and calibrate. Never `command`.
 */
export const createSidecarTower = (options: SidecarOptions): TowerPort => {
  let snapshot = unavailableTower();
  const sent: TowerSent[] = [];
  let socket: WebSocket | undefined;
  let wantConnect = false;
  let connecting = false;
  /** Welcome arrived; the next `connection` frame is tower-poc's reading from before connect. */
  let helloReply = false;
  /** Connect was sent and no `connection` frame has answered it yet. */
  let connectSent = false;
  /** The last connection tower-poc reported. */
  let reported: TowerSnapshot["connection"] = "unavailable";
  let chain: Promise<void> = Promise.resolve();

  const track = (step: Promise<void>) => {
    chain = chain.then(() => step).catch(() => undefined);
  };

  const send = (type: "hello" | "connect" | "calibrate", payload: unknown) => {
    if (!OUTBOUND.has(type) || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ v: 1, type, payload }));
    sent.push({ type });
    diag(options.diagLogPath, "out", type);
  };

  const onMessage = (raw: WebSocket.RawData) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== "object") return;
    const message = parsed as Record<string, unknown>;
    const type = typeof message.type === "string" ? message.type : "";
    if (!type) return;
    diag(options.diagLogPath, "in", type);
    const payload =
      message.payload && typeof message.payload === "object"
        ? (message.payload as Record<string, unknown>)
        : {};
    if (type === "welcome" && wantConnect) {
      // tower-poc follows welcome with where the tower stands. Connect only after reading it.
      wantConnect = false;
      helloReply = true;
      return;
    }
    if (type === "connection") {
      const state = typeof payload.state === "string" ? payload.state : undefined;
      const calibration = typeof payload.calibration === "string" ? payload.calibration : undefined;
      reported = mapConnection(state);
      const calibrated = mapCalibration(calibration);
      const moving = reported === "connected" || reported === "connecting";
      if (helloReply) {
        helloReply = false;
        if (!moving) {
          // The reading from before our connect. Stay connecting until the connect is answered.
          snapshot = { ...snapshot, calibrated };
          connectSent = true;
          send("connect", {});
          return;
        }
      } else if ((wantConnect || connectSent) && !moving) {
        // A broadcast from before tower-poc read our connect, such as another client's disconnect.
        // tower-poc answers connect with an error or with connecting, so keep waiting for that.
        snapshot = { ...snapshot, calibrated };
        return;
      }
      connecting = false;
      connectSent = false;
      snapshot = { ...snapshot, connection: reported, calibrated };
      return;
    }
    if (type === "error" && connectSent) {
      // tower-poc refused the connect. Nothing changed, so go back to the last reading.
      connecting = false;
      connectSent = false;
      snapshot = { ...snapshot, connection: reported };
      return;
    }
    if (type === "state") {
      const values =
        payload.snapshot && typeof payload.snapshot === "object"
          ? (payload.snapshot as Record<string, unknown>)
          : {};
      snapshot = { ...snapshot, battery: mapBattery(values["battery.level"]) };
    }
  };

  const drop = () => {
    wantConnect = false;
    connecting = false;
    helloReply = false;
    connectSent = false;
    reported = "disconnected";
    socket = undefined;
    // Disconnected, not unavailable: the attempt ended, so a later press can try again.
    snapshot = {
      connection: "disconnected",
      battery: { state: "unavailable" },
      calibrated: { state: "unavailable" },
    };
  };

  return {
    snapshot: () => snapshot,
    connect: () => {
      if (snapshot.connection === "connected" || connecting || wantConnect) return;
      wantConnect = true;
      connecting = true;
      snapshot = { ...snapshot, connection: "connecting" };
      if (socket && socket.readyState === WebSocket.OPEN) {
        send("hello", { clientLabel: "bloodtower" });
        return;
      }
      if (socket && socket.readyState === WebSocket.CONNECTING) return;
      const opened = new WebSocket(options.url);
      socket = opened;
      track(
        new Promise((resolve) => {
          const finish = () => resolve();
          opened.once("open", () => {
            send("hello", { clientLabel: "bloodtower" });
            finish();
          });
          opened.once("error", finish);
          opened.once("close", () => {
            if (socket === opened) drop();
            finish();
          });
          opened.on("message", (raw) => {
            if (socket !== opened) return;
            onMessage(raw);
          });
        }),
      );
    },
    calibrate: () => {
      if (snapshot.connection !== "connected") return;
      send("calibrate", {});
    },
    close: () => {
      const current = socket;
      drop();
      current?.close();
    },
    sent: () => sent,
    settled: () => chain,
  };
};

/** `DIAG_LOG` is the hardware log path. A blank value leaves it off. */
export const diagLogPathFromEnv = (env: NodeJS.ProcessEnv): string | undefined => {
  const value = env.DIAG_LOG;
  if (!value) return undefined;
  return value;
};
