import { randomBytes } from "node:crypto";
import {
  type ControlAction,
  type ControlLock,
  type DeviceState,
  deviceStatePayloadSchema,
  type Pack,
  type PauseCause,
  type StoryboardState,
  storyboardStatePayloadSchema,
  type TowerSnapshot,
} from "bloodtower-protocols";
import { lockPresses, type PressInput, type PressLog } from "../control/lock.ts";
import type { RosterSnapshot } from "../db/store.ts";
import type { TimingLog } from "../timing/log.ts";
import { type Beat, beatsForNight, privateText } from "./beats.ts";

export interface JoinOk {
  ok: true;
  deviceId: string;
  token: string;
}
export interface Fail {
  ok: false;
  code: "bad-code" | "bad-token" | "unknown-device" | "invalid-state";
}
export interface PressOk {
  ok: true;
  winner: boolean;
  lock: ControlLock;
  action: ControlAction;
}

interface DeviceRow {
  deviceId: string;
  formFactor: "ipad" | "phone";
  token: string;
  connected: boolean;
}

interface PauseRow {
  cause: PauseCause;
  hunter: string | null;
  subject: string;
}

export interface SessionEngine {
  sessionId: string;
  join: (input: { joinCode: string; formFactor: "ipad" | "phone" }) => JoinOk | Fail;
  rejoin: (token: string) => { ok: true; deviceId: string; held: string[] } | Fail;
  disconnect: (deviceId: string) => void;
  hold: (deviceId: string, hunter: string, action: "take" | "release") => { ok: true } | Fail;
  press: (deviceId: string, promptId: string, action: ControlAction) => PressOk | Fail;
  pressAll: (presses: readonly (PressInput & { deviceId: string })[]) => Array<PressOk | Fail>;
  projectStoryboard: (tower: TowerSnapshot, joinUrl: string | null) => StoryboardState;
  projectDevice: (deviceId: string) => DeviceState;
  lockFor: (promptId: string) => ControlLock | null;
  /** Prompt id for a host pause, or null when play is not running. */
  pausePromptId: () => string | null;
  roster: () => RosterSnapshot;
}

export interface SessionOptions {
  sessionId?: string;
  joinCode: string;
  /** Hunters absent when the night starts. Presence then stays fixed (E15). */
  absent?: readonly string[];
  tokens?: () => string;
  timing: TimingLog;
  presses: PressLog;
  saveRoster: (snapshot: RosterSnapshot) => void;
  startedWall: string;
  /**
   * Live tower reading. A connect lock is kept only while this reading is
   * `connecting` or `connected`. Any other reading releases it, including when
   * a failed attempt ends on the same word it started on. Calibrate is legal
   * only while the reading is `connected`.
   */
  tower?: () => TowerSnapshot;
}

const newToken = () => randomBytes(16).toString("base64url");

const holdingKey = (deviceId: string, hunter: string) => `${deviceId}\0${hunter}`;

export const createSession = (pack: Pack, options: SessionOptions): SessionEngine => {
  const hunters = pack.hunters.map((hunter) => ({ id: hunter.id, name: hunter.name }));
  const hunterIds = new Set(hunters.map((hunter) => hunter.id));
  const absent = new Set(options.absent ?? []);
  for (const id of absent) {
    if (!hunterIds.has(id)) throw new Error(`${id} is not a hunter in this pack.`);
  }
  const night = pack.nights[0];
  const phase = night?.phases[0];
  if (!night || !phase) throw new Error("The pack has no night.");
  const beats = beatsForNight(pack, absent);
  const sessionId = options.sessionId ?? `session-${randomBytes(8).toString("hex")}`;

  const devices = new Map<string, DeviceRow>();
  const held = new Set<string>();
  const locks: Record<string, ControlLock> = {};
  let seq = 0;
  let tokenSeq = 0;
  const tokens = options.tokens ?? newToken;
  let stage: "lobby" | "playing" | "paused" = "lobby";
  let beatIndex = 0;
  let finished = false;
  let pause: PauseRow | null = null;
  let pauseSerial = 0;
  let openMoment: string | null = null;
  let openCue: string | null = null;
  let openPhase: string | null = null;
  const readTower =
    options.tower ??
    ((): TowerSnapshot => ({
      connection: "unavailable",
      battery: { state: "unavailable" },
      calibrated: { state: "unavailable" },
    }));
  /** True while `pressAll` is deciding one batch, so the first press keeps the lock. */
  let inBatch = false;

  const reconcileTowerLocks = () => {
    if (inBatch) return;
    const connection = readTower().connection;
    if (locks["tower-connect"] && connection !== "connected" && connection !== "connecting") {
      delete locks["tower-connect"];
    }
    if (locks["tower-calibrate"] && connection !== "connected") delete locks["tower-calibrate"];
  };

  const heldBy = (deviceId: string) =>
    hunters
      .filter((hunter) => held.has(holdingKey(deviceId, hunter.id)))
      .map((hunter) => hunter.id);

  const holdersOf = (hunter: string) =>
    [...devices.values()]
      .filter((device) => held.has(holdingKey(device.deviceId, hunter)))
      .map((device) => device.deviceId);

  const connectedHolders = (hunter: string) =>
    holdersOf(hunter).filter((deviceId) => devices.get(deviceId)?.connected === true);

  const blockedHunters = () => hunters.filter((hunter) => connectedHolders(hunter.id).length === 0);

  const unheldHunters = () => hunters.filter((hunter) => holdersOf(hunter.id).length === 0);

  const roster = (): RosterSnapshot => ({
    sessionId,
    packId: pack.pack_id,
    packVersion: pack.version,
    startedWall: options.startedWall,
    joinCode: options.joinCode,
    devices: [...devices.values()].map((device) => ({
      deviceId: device.deviceId,
      formFactor: device.formFactor,
      token: device.token,
      connected: device.connected,
    })),
    holdings: [...held].map((key) => {
      const [deviceId, hunter] = key.split("\0");
      return { deviceId: deviceId ?? "", hunter: hunter ?? "" };
    }),
  });

  const persist = () => options.saveRoster(roster());

  const currentBeat = (): Beat | undefined => beats[beatIndex];

  const gameplayPrompt = (): { id: string; action: ControlAction; label: string } | null => {
    if (stage === "lobby") {
      if (unheldHunters().length > 0) return null;
      return { id: "begin", action: "begin", label: "Begin" };
    }
    if (stage === "paused") {
      if (pause?.cause === "host-pause" && blockedHunters().length === 0) {
        return { id: `resume-${pauseSerial}`, action: "resume", label: "Resume" };
      }
      return null;
    }
    if (finished) return null;
    const beat = currentBeat();
    if (!beat) return null;
    return { id: `continue-${beatIndex}`, action: "continue", label: "Continue" };
  };

  const openBeat = (beat: Beat) => {
    options.timing.open({
      kind: "moment",
      subject: beat.momentSubject,
      deviceId: null,
      cause: null,
      hunter: null,
    });
    openMoment = beat.momentSubject;
    if (beat.cue) {
      options.timing.open({
        kind: "cue",
        subject: beat.cue,
        deviceId: null,
        cause: null,
        hunter: null,
      });
      openCue = beat.cue;
    }
  };

  const closeBeat = () => {
    if (openCue) {
      options.timing.close("cue", openCue);
      openCue = null;
    }
    if (openMoment) {
      options.timing.close("moment", openMoment);
      openMoment = null;
    }
  };

  const openPause = (
    cause: PauseCause,
    hunter: string | null,
    subject: string,
    deviceId: string | null,
  ) => {
    options.timing.open({
      kind: "pause",
      subject,
      deviceId,
      cause,
      hunter,
      result: null,
    });
    pause = { cause, hunter, subject };
    stage = "paused";
  };

  const closePause = () => {
    if (!pause) return;
    options.timing.close("pause", pause.subject);
    pause = null;
    stage = "playing";
  };

  /**
   * A hunter with no connected holder pauses play. Host pause is replaced by that,
   * so the banner names the hunter. Rejoin or a new holder ends that pause.
   * A host pause stays until Resume, and Resume is refused while a hunter is blocked.
   */
  const refreshPause = (trigger: "disconnect" | "unheld-hunter") => {
    if (stage === "lobby") return;
    const blocked = blockedHunters();
    if (blocked.length > 0) {
      const hunter = blocked[0]?.id ?? null;
      const subject = `${trigger}:${hunter ?? "hunter"}`;
      if (stage === "playing") {
        openPause(trigger, hunter, subject, null);
        return;
      }
      if (pause?.cause === "host-pause") {
        closePause();
        openPause(trigger, hunter, subject, null);
        return;
      }
      if (
        pause &&
        hunter &&
        pause.hunter !== hunter &&
        !blocked.some((item) => item.id === pause?.hunter)
      ) {
        closePause();
        openPause(trigger, hunter, subject, null);
      }
      return;
    }
    if (stage === "paused" && pause && pause.cause !== "host-pause") closePause();
  };

  const applyWin = (action: ControlAction, deviceId: string) => {
    if (action === "begin") {
      stage = "playing";
      options.timing.open({
        kind: "phase",
        subject: phase.id,
        deviceId: null,
        cause: null,
        hunter: null,
      });
      openPhase = phase.id;
      const beat = currentBeat();
      if (beat) openBeat(beat);
      else finished = true;
      refreshPause("disconnect");
      return;
    }
    if (action === "continue") {
      closeBeat();
      beatIndex += 1;
      const beat = currentBeat();
      if (!beat) {
        finished = true;
        if (openPhase) {
          options.timing.close("phase", openPhase);
          openPhase = null;
        }
        return;
      }
      openBeat(beat);
      return;
    }
    if (action === "pause") {
      pauseSerial += 1;
      openPause("host-pause", null, `host-pause:${pauseSerial}`, deviceId);
      return;
    }
    if (action === "resume") closePause();
  };

  const legal = (promptId: string, action: ControlAction) => {
    if (action === "tower-connect") {
      if (promptId !== "tower-connect") return false;
      const connection = readTower().connection;
      return connection !== "connected" && connection !== "connecting";
    }
    if (action === "tower-calibrate") {
      return promptId === "tower-calibrate" && readTower().connection === "connected";
    }
    if (action === "pause") {
      return stage === "playing" && !finished && promptId === `pause-${pauseSerial + 1}`;
    }
    const prompt = gameplayPrompt();
    return prompt !== null && prompt.id === promptId && prompt.action === action;
  };

  const connectedDevice = (deviceId: string) => {
    const device = devices.get(deviceId);
    if (!device?.connected) return undefined;
    return device;
  };

  persist();

  const engine: SessionEngine = {
    sessionId,

    join: ({ joinCode, formFactor }) => {
      if (joinCode !== options.joinCode) return { ok: false, code: "bad-code" };
      seq += 1;
      let token = tokens();
      tokenSeq += 1;
      if ([...devices.values()].some((device) => device.token === token)) {
        token = `${token}-${tokenSeq}`;
      }
      const deviceId = `device-${seq}`;
      devices.set(deviceId, { deviceId, formFactor, token, connected: true });
      persist();
      return { ok: true, deviceId, token };
    },

    rejoin: (token) => {
      const device = [...devices.values()].find((item) => item.token === token);
      if (!device) return { ok: false, code: "bad-token" };
      device.connected = true;
      refreshPause("disconnect");
      persist();
      return { ok: true, deviceId: device.deviceId, held: heldBy(device.deviceId) };
    },

    disconnect: (deviceId) => {
      const device = devices.get(deviceId);
      if (!device) return;
      device.connected = false;
      refreshPause("disconnect");
      persist();
    },

    hold: (deviceId, hunter, action) => {
      if (!connectedDevice(deviceId)) return { ok: false, code: "unknown-device" };
      if (!hunterIds.has(hunter)) return { ok: false, code: "invalid-state" };
      const key = holdingKey(deviceId, hunter);
      if (action === "take") held.add(key);
      else held.delete(key);
      refreshPause("unheld-hunter");
      persist();
      return { ok: true };
    },

    press: (deviceId, promptId, action) => {
      if (!connectedDevice(deviceId)) return { ok: false, code: "unknown-device" };
      reconcileTowerLocks();
      const existing = locks[promptId];
      if (existing) {
        options.presses.record({ promptId, action, deviceId, winner: false });
        return { ok: true, winner: false, lock: existing, action: existing.action };
      }
      if (!legal(promptId, action)) return { ok: false, code: "invalid-state" };
      const decided = lockPresses(locks, [{ promptId, action, deviceId }]);
      const winner = decided.winners[0] === true;
      Object.assign(locks, decided.locks);
      options.presses.record({ promptId, action, deviceId, winner });
      const lock = locks[promptId];
      if (!lock) return { ok: false, code: "invalid-state" };
      if (winner) applyWin(action, deviceId);
      persist();
      return { ok: true, winner, lock, action };
    },

    pressAll: (batch) => {
      const results: Array<PressOk | Fail> = [];
      inBatch = true;
      try {
        for (const press of batch)
          results.push(engine.press(press.deviceId, press.promptId, press.action));
      } finally {
        inBatch = false;
      }
      return results;
    },

    projectStoryboard: (tower, joinUrl) => {
      reconcileTowerLocks();
      const beat = stage === "lobby" || finished ? undefined : currentBeat();
      const prompt = gameplayPrompt();
      const promptLock = prompt ? (locks[prompt.id] ?? null) : null;
      const unheld = unheldHunters().map((hunter) => hunter.id);
      return storyboardStatePayloadSchema.parse({
        stage,
        hunters: hunters.map((hunter) => ({
          id: hunter.id,
          name: hunter.name,
          holders: holdersOf(hunter.id),
        })),
        join: joinUrl ? { code: options.joinCode, url: joinUrl } : null,
        prompt: prompt ? { id: prompt.id, label: prompt.label } : null,
        moment: beat?.storyboard ?? null,
        pause: pause ? { cause: pause.cause, hunter: pause.hunter } : null,
        tower,
        gate: { canBegin: unheld.length === 0, unheld },
        lock: promptLock,
      });
    },

    projectDevice: (deviceId) => {
      reconcileTowerLocks();
      const prompt = gameplayPrompt();
      const promptLock = prompt ? (locks[prompt.id] ?? null) : null;
      const mine = heldBy(deviceId);
      const beat = stage === "lobby" || finished ? undefined : currentBeat();
      return deviceStatePayloadSchema.parse({
        heldHunters: mine,
        views: mine.map((hunter) => {
          const moment = beat?.privates.get(hunter);
          const text = moment ? privateText(moment) : null;
          return {
            hunter,
            name: hunters.find((item) => item.id === hunter)?.name ?? hunter,
            privateMoment:
              moment && text ? { momentId: moment.id, text, still: moment.asset ?? null } : null,
          };
        }),
        prompt: prompt ? { id: prompt.id, label: prompt.label } : null,
        lock: promptLock,
        won: promptLock ? promptLock.winnerDeviceId === deviceId : null,
      });
    },

    lockFor: (promptId) => {
      reconcileTowerLocks();
      return locks[promptId] ?? null;
    },

    pausePromptId: () => (stage === "playing" && !finished ? `pause-${pauseSerial + 1}` : null),

    roster,
  };

  return engine;
};
