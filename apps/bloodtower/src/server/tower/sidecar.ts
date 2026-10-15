import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
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
      wantConnect = false;
      connecting = true;
      snapshot = { ...snapshot, connection: "connecting" };
      send("connect", {});
      return;
    }
    if (type === "connection") {
      connecting = false;
      const state = typeof payload.state === "string" ? payload.state : undefined;
      const calibration = typeof payload.calibration === "string" ? payload.calibration : undefined;
      snapshot = {
        ...snapshot,
        connection: mapConnection(state),
        calibrated: mapCalibration(calibration),
      };
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
    socket = undefined;
    snapshot = unavailableTower();
  };

  return {
    snapshot: () => snapshot,
    connect: () => {
      if (snapshot.connection === "connected" || connecting || wantConnect) return;
      wantConnect = true;
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
