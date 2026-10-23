import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { TowerSnapshot } from "bloodtower-protocols";
import { WebSocket } from "ws";
import type { HostLogger } from "../log/hostLog.ts";
import {
  mapBattery,
  mapCalibration,
  mapConnection,
  mapFirmware,
  unavailableTower,
} from "./snapshot.ts";
import type { SoundResult, TowerPort, TowerSent } from "./types.ts";

/** tower-poc's socket. This process does not start tower-poc. */
export const DEFAULT_SIDECAR_URL = "ws://127.0.0.1:4747/ws";

const OUTBOUND = new Set(["hello", "connect", "calibrate", "command"]);

/** tower-poc's capability for a sound with a volume tier. It is the only command this sends. */
const SOUND_CAPABILITY = "sound.play-stateful";
/** A command that has not ended by now is treated as failed. The executor has its own timeouts. */
const SOUND_TIMEOUT_MS = 15_000;
const WRITTEN_STAGES = new Set(["write-completed", "confirmed", "indeterminate"]);
const FAILED_STAGES = new Set(["failed", "timed-out", "rejected"]);

export interface SidecarOptions {
  url: string;
  /**
   * Hardware trace. Lines are `{ at, dir, type }` with no payload.
   * This file stays separate from the decision 0003 error log. Command fail, timeout and
   * no-answer are the only tower outcomes written to `log`.
   */
  diagLogPath?: string;
  /** Decision 0003 log. Command fail, timeout and no-answer are errors here. */
  log?: HostLogger;
  /** Tests shorten the wait. A command that outlives it is an error. */
  commandTimeoutMs?: number;
}

/**
 * A client of tower-poc. The socket stays closed until `connect()`.
 * A dropped socket is not reopened. Calibrate is sent only while the tower is connected.
 * Outbound types are hello, connect, calibrate and `command`. The only command is
 * `sound.play-stateful` (a library sound index and a volume tier), sent by `playSound`. No light
 * cue and no raw bytes. A sound is never sent again after a failure.
 * A command that fails, times out, or gets no answer is an error in `log`. DIAG_LOG is not copied.
 */
export const createSidecarTower = (options: SidecarOptions): TowerPort => {
  const timeoutMs = options.commandTimeoutMs ?? SOUND_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("commandTimeoutMs must be a positive number.");
  }
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
  /** Sounds sent and not yet answered, by command id. */
  const pendingSounds = new Map<string, (result: SoundResult) => void>();
  let commandSerial = 0;

  const report = (code: string, message: string) => {
    const text = message.trim() === "" ? "The tower reported an error with no message." : message;
    if (options.log) options.log.error(code, text);
    else console.error(`${code}: ${text}`);
  };

  const writeDiag = (dir: "in" | "out", type: string) => {
    const path = options.diagLogPath;
    if (!path) return;
    try {
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), dir, type })}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report("diag-log", `DIAG_LOG write failed: ${message}`);
    }
  };

  const track = (step: Promise<void>) => {
    chain = chain
      .then(() => step)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        report("tower-socket", message);
      });
  };

  const send = (
    type: "hello" | "connect" | "calibrate" | "command",
    payload: unknown,
    extra?: { id: string; entry: TowerSent },
  ): boolean => {
    if (!OUTBOUND.has(type) || !socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ v: 1, type, ...(extra ? { id: extra.id } : {}), payload }));
    sent.push(extra?.entry ?? { type });
    writeDiag("out", type);
    return true;
  };

  const endSounds = (result: SoundResult) => {
    for (const [id, finish] of [...pendingSounds]) {
      pendingSounds.delete(id);
      if (result === "failed") {
        report("tower-command-no-answer", `Sound command ${id} got no answer.`);
      }
      finish(result);
    }
  };

  const onMessage = (raw: WebSocket.RawData) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(raw));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report("tower-frame", `Tower message is not valid JSON: ${message}`);
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      report("tower-frame", "Tower message is not a JSON object.");
      return;
    }
    const message = parsed as Record<string, unknown>;
    const type = typeof message.type === "string" ? message.type : "";
    if (!type) {
      report("tower-frame", "Tower message has no type.");
      return;
    }
    writeDiag("in", type);
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
      // The tower reports its firmware once, on connect. A tower that is not connected has none.
      if (reported !== "connected") snapshot = { ...snapshot, firmware: { state: "unavailable" } };
      else if (payload.device !== undefined) {
        snapshot = { ...snapshot, firmware: mapFirmware(payload.device) };
      }
      if (reported !== "connected") endSounds("failed");
      return;
    }
    if (type === "command.lifecycle") {
      const id = typeof payload.commandId === "string" ? payload.commandId : "";
      const stage = typeof payload.stage === "string" ? payload.stage : "";
      const finish = pendingSounds.get(id);
      if (!finish) return;
      // tower-poc ends a command it never wrote as `indeterminate` with `written: false`.
      if (payload.written === false) {
        pendingSounds.delete(id);
        report("tower-command-failed", `Sound command ${id} was not written.`);
        finish("failed");
      } else if (WRITTEN_STAGES.has(stage)) {
        pendingSounds.delete(id);
        finish("written");
      } else if (stage === "timed-out") {
        pendingSounds.delete(id);
        report("tower-command-timeout", `Sound command ${id} ended timed-out.`);
        finish("failed");
      } else if (FAILED_STAGES.has(stage)) {
        pendingSounds.delete(id);
        report("tower-command-failed", `Sound command ${id} ended ${stage}.`);
        finish("failed");
      }
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
    endSounds("failed");
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
            try {
              send("hello", { clientLabel: "bloodtower" });
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              report("tower-socket", message);
            }
            finish();
          });
          opened.once("error", (error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            report("tower-socket", message);
            finish();
          });
          opened.once("close", () => {
            if (socket === opened) drop();
            finish();
          });
          opened.on("message", (raw) => {
            if (socket !== opened) return;
            try {
              onMessage(raw);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              report("tower-frame", message);
            }
          });
        }),
      );
    },
    calibrate: () => {
      if (snapshot.connection !== "connected") return;
      send("calibrate", {});
    },
    playSound: (soundIndex, volume) => {
      if (snapshot.connection !== "connected") {
        report(
          "tower-command-failed",
          `Sound ${soundIndex} at volume ${volume} was not sent because the tower is not connected.`,
        );
        return Promise.resolve("failed");
      }
      commandSerial += 1;
      const id = `bt-sound-${commandSerial}`;
      return new Promise<SoundResult>((resolve) => {
        const timer = setTimeout(() => {
          const finish = pendingSounds.get(id);
          if (!finish) return;
          pendingSounds.delete(id);
          report(
            "tower-command-timeout",
            `Sound ${soundIndex} at volume ${volume} timed out with no answer (${id}).`,
          );
          finish("failed");
        }, timeoutMs);
        timer.unref?.();
        pendingSounds.set(id, (result) => {
          clearTimeout(timer);
          resolve(result);
        });
        const wrote = send(
          "command",
          { capabilityId: SOUND_CAPABILITY, params: { soundIndex, volume } },
          { id, entry: { type: "sound", soundIndex, volume } },
        );
        if (!wrote) {
          const finish = pendingSounds.get(id);
          if (!finish) return;
          pendingSounds.delete(id);
          report(
            "tower-command-failed",
            `Sound ${soundIndex} at volume ${volume} was not sent (${id}).`,
          );
          finish("failed");
        }
      });
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
