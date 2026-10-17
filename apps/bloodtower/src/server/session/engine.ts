import { randomBytes } from "node:crypto";
import {
  type ControlAction,
  type ControlLock,
  type DeviceState,
  deviceStatePayloadSchema,
  type FlowScreen,
  KEEPER_LINE_COUNT,
  KEEPER_MOMENT_ID,
  type Pack,
  type PauseCause,
  type Stories,
  type StoryboardState,
  type StoryCard,
  storyboardStatePayloadSchema,
  type TowerSnapshot,
} from "bloodtower-protocols";
import { lockPresses, type PressInput, type PressLog } from "../control/lock.ts";
import type { RosterSnapshot } from "../db/store.ts";
import type { StoryEntry } from "../pack/load.ts";
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
  /** `option` is required for a `pick` and refused for any other action. */
  press: (
    deviceId: string,
    promptId: string,
    action: ControlAction,
    option?: string,
  ) => PressOk | Fail;
  pressAll: (presses: readonly (PressInput & { deviceId: string })[]) => Array<PressOk | Fail>;
  /**
   * The story board finished Keeper line `line` (D7 exception). Acts only when the scene is on
   * that line and `momentId` is the Keeper. Returns false for anything else, so late or
   * duplicate messages do nothing.
   */
  keeperLineEnded: (momentId: string, line: number) => boolean;
  /** The option a pick moment was resolved with, or null if it has not been picked. */
  pickedOption: (momentId: string) => string | null;
  projectStoryboard: (
    tower: TowerSnapshot,
    join: { url: string; reachable: boolean } | null,
  ) => StoryboardState;
  projectDevice: (deviceId: string) => DeviceState;
  /** The hunters of the story the session is bound to: id and name only. */
  hunterRoster: () => { id: string; name: string }[];
  /**
   * Moves the highlight on Pick Story. Not a press: no lock, no screen change. Refused off
   * Pick Story, from a device that is not connected, and for a story that is not in the list.
   */
  focusStory: (deviceId: string, storyId: string) => { ok: true } | Fail;
  lockFor: (promptId: string) => ControlLock | null;
  /** Prompt id for a host pause, or null when play is not running. */
  pausePromptId: () => string | null;
  /** The screen the server holds right now. */
  screen: () => FlowScreen;
  /** Leaves the splash screen once the pack and the socket host are ready. Not a press. */
  finishSplash: () => void;
  roster: () => RosterSnapshot;
  /** Clears the grace timers. Call it when the host closes. */
  close: () => void;
}

/** How long a dropped device's hunters stay claimed before they become unclaimed (R2-104, §3.4). */
export const GRACE_MS = 60_000;

export interface SessionOptions {
  /** Claim hold after a device drops. Defaults to GRACE_MS. */
  graceMs?: number;
  /** Called when a grace timer releases hunters, so the host can publish the change. */
  onChange?: () => void;
  sessionId?: string;
  joinCode: string;
  /** Hunters absent when the night starts. Presence then stays fixed (E15). */
  absent?: readonly string[];
  /**
   * The doors on Pick Story. `storyId` names the entry whose pack is the one passed to
   * `createSession`, the story the session starts bound to. Without this the list is that
   * one pack, preselected.
   */
  stories?: readonly StoryEntry[];
  storyId?: string;
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

/** Each step before play moves to the next screen. Play, quit and splash are handled apart. */
const NEXT_BEFORE_PLAY: Partial<Record<FlowScreen, FlowScreen>> = {
  "tower-connect": "pick-story",
  "pick-story": "party-join",
  "party-join": "begin",
};

const holdingKey = (deviceId: string, hunter: string) => `${deviceId}\0${hunter}`;

/** The pack-bound parts of a session. They change only when Pick Story binds another story. */
interface Binding {
  pack: Pack;
  hunters: { id: string; name: string }[];
  hunterIds: Set<string>;
  phase: { id: string };
  beats: Beat[];
}

const bindPack = (pack: Pack, absent: ReadonlySet<string>): Binding => {
  const hunters = pack.hunters.map((hunter) => ({ id: hunter.id, name: hunter.name }));
  const hunterIds = new Set(hunters.map((hunter) => hunter.id));
  for (const id of absent) {
    if (!hunterIds.has(id)) throw new Error(`${id} is not a hunter in this pack.`);
  }
  const phase = pack.nights[0]?.phases[0];
  if (!phase) throw new Error("The pack has no night.");
  return { pack, hunters, hunterIds, phase, beats: beatsForNight(pack, absent) };
};

export const createSession = (initialPack: Pack, options: SessionOptions): SessionEngine => {
  let { pack, hunters, hunterIds, phase, beats } = bindPack(
    initialPack,
    new Set(options.absent ?? []),
  );
  const initialId = options.storyId ?? initialPack.pack_id;
  const entries: readonly StoryEntry[] = options.stories ?? [
    {
      card: {
        id: initialId,
        title: initialPack.title,
        blurb: initialPack.tone ?? null,
        players: initialPack.players,
        loadable: true,
      },
      pack: initialPack,
      issues: [],
    },
  ];
  if (!entries.some((entry) => entry.card.id === initialId && entry.pack)) {
    throw new Error(`${initialId} is not a loadable story in the list.`);
  }
  let currentStory = initialId;
  /** The highlighted door on Pick Story. It starts on the bound story. */
  let focusedStory = initialId;
  const storyEntry = (id: string) => entries.find((entry) => entry.card.id === id);
  const sessionId = options.sessionId ?? `session-${randomBytes(8).toString("hex")}`;

  const devices = new Map<string, DeviceRow>();
  const held = new Set<string>();
  const graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const graceMs = options.graceMs ?? GRACE_MS;
  const locks: Record<string, ControlLock> = {};
  let seq = 0;
  let tokenSeq = 0;
  const tokens = options.tokens ?? newToken;
  /** `lobby` covers every screen before play. `ended` is set by Quit. */
  let stage: "lobby" | "playing" | "paused" | "ended" = "lobby";
  let screen: FlowScreen = "splash";
  let beatIndex = 0;
  let finished = false;
  let pause: PauseRow | null = null;
  let pauseSerial = 0;
  let openMoment: string | null = null;
  let openCue: string | null = null;
  let openPhase: string | null = null;
  /** The Keeper line on screen, or null outside the Keeper scene. */
  let keeperLine: number | null = null;
  /** Pick moment id to the option the winning iPad chose. */
  const picked = new Map<string, string>();
  const storiesState = (): Stories => ({
    cards: entries.map((entry): StoryCard => entry.card),
    focus: focusedStory,
    current: currentStory,
  });
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

  const cancelGrace = (deviceId: string) => {
    const timer = graceTimers.get(deviceId);
    if (!timer) return;
    clearTimeout(timer);
    graceTimers.delete(deviceId);
  };

  /** A device still gone after the grace period: its hunters become unclaimed. */
  const releaseDropped = (deviceId: string) => {
    graceTimers.delete(deviceId);
    const device = devices.get(deviceId);
    if (!device || device.connected) return;
    for (const hunter of heldBy(deviceId)) held.delete(holdingKey(deviceId, hunter));
    refreshPause("unheld-hunter");
    persist();
    options.onChange?.();
  };

  const startGrace = (deviceId: string) => {
    cancelGrace(deviceId);
    const timer = setTimeout(() => releaseDropped(deviceId), graceMs);
    timer.unref?.();
    graceTimers.set(deviceId, timer);
  };

  const currentBeat = (): Beat | undefined => beats[beatIndex];

  /** The step the iPads may press next, or null. Quit has its own prompt (`quitPromptId`). */
  const gameplayPrompt = (): { id: string; action: ControlAction; label: string } | null => {
    if (screen === "splash" || screen === "quit") return null;
    if (screen === "tower-connect") {
      return { id: "continue-tower-connect", action: "continue", label: "Next: pick a story" };
    }
    if (screen === "pick-story") {
      // The prompt names the story, so a press made on a stale highlight is refused (R2 §3.3).
      const card = storyEntry(focusedStory)?.card;
      if (!card?.loadable) return null;
      return {
        id: `continue-pick-story-${card.id}`,
        action: "continue",
        label: `Choose ${card.title}`,
      };
    }
    if (screen === "party-join") {
      if (unheldHunters().length > 0) return null;
      return { id: "continue-party-join", action: "continue", label: "Next: set up the story" };
    }
    if (screen === "begin") {
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
    if (beat.pick) return { id: `pick-${beatIndex}`, action: "pick", label: beat.pick.prompt };
    // Each Keeper line has its own prompt, so each Continue is a fresh lock.
    if (keeperLine !== null) {
      return { id: `continue-${beatIndex}-${keeperLine}`, action: "continue", label: "Continue" };
    }
    return { id: `continue-${beatIndex}`, action: "continue", label: "Continue" };
  };

  const openBeat = (beat: Beat) => {
    keeperLine = beat.storyboard?.id === KEEPER_MOMENT_ID ? 0 : null;
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
    keeperLine = null;
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
    if (stage === "lobby" || stage === "ended") return;
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

  /** The screen a winning press of this action moves the flow to. */
  const screenAfter = (action: ControlAction): FlowScreen => {
    if (action === "begin") return "play";
    if (action === "quit") return "quit";
    if (action === "continue" && screen !== "play") {
      return NEXT_BEFORE_PLAY[screen] ?? screen;
    }
    return screen;
  };

  /** Moves to the next beat. The Keeper's last line ends the scene the same way. */
  const advanceBeat = () => {
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
  };

  /** Binds the focused story. A different story starts with no holdings: its hunters differ. */
  const bindFocusedStory = () => {
    if (focusedStory === currentStory) return;
    const next = storyEntry(focusedStory)?.pack;
    if (!next) return;
    ({ pack, hunters, hunterIds, phase, beats } = bindPack(next, new Set()));
    currentStory = focusedStory;
    beatIndex = 0;
    held.clear();
  };

  const applyWin = (action: ControlAction, deviceId: string, option?: string) => {
    if (action === "continue" && screen === "pick-story") bindFocusedStory();
    screen = screenAfter(action);
    if (action === "quit") {
      closeBeat();
      if (pause) closePause();
      if (openPhase) {
        options.timing.close("phase", openPhase);
        openPhase = null;
      }
      stage = "ended";
      finished = true;
      return;
    }
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
    // A step before play only moves the screen. Story beats start at Begin.
    if (action === "continue" && screen !== "play") return;
    if (action === "continue") {
      // A Keeper line moves on one line; the last line's Continue skips the scene.
      if (keeperLine !== null && keeperLine < KEEPER_LINE_COUNT - 1) {
        keeperLine += 1;
        return;
      }
      advanceBeat();
      return;
    }
    if (action === "pick") {
      const beat = currentBeat();
      if (beat?.pick && option) picked.set(beat.pick.momentId, option);
      advanceBeat();
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
    if (action === "quit") return promptId === "quit" && screen === "play";
    const prompt = gameplayPrompt();
    return prompt !== null && prompt.id === promptId && prompt.action === action;
  };

  /** True when `option` is one of the current pick's options. */
  const pickOptionOk = (option: string | undefined) => {
    const beat = currentBeat();
    return !!option && (beat?.pick?.options.some((item) => item.id === option) ?? false);
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
      cancelGrace(device.deviceId);
      refreshPause("disconnect");
      persist();
      return { ok: true, deviceId: device.deviceId, held: heldBy(device.deviceId) };
    },

    disconnect: (deviceId) => {
      const device = devices.get(deviceId);
      if (!device?.connected) return;
      device.connected = false;
      if (heldBy(deviceId).length > 0) startGrace(deviceId);
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

    press: (deviceId, promptId, action, option) => {
      if (!connectedDevice(deviceId)) return { ok: false, code: "unknown-device" };
      reconcileTowerLocks();
      // Logged with the screen it was made on. A win also logs the screen it moved to, before
      // applyWin opens any mark, so a winning press always precedes the marks it opened.
      const pressedOn = screen;
      const existing = locks[promptId];
      if (existing) {
        options.presses.record({
          promptId,
          action,
          deviceId,
          winner: false,
          screen: pressedOn,
          nextScreen: null,
        });
        return { ok: true, winner: false, lock: existing, action: existing.action };
      }
      if (!legal(promptId, action)) return { ok: false, code: "invalid-state" };
      if (action === "pick" && !pickOptionOk(option)) return { ok: false, code: "invalid-state" };
      const decided = lockPresses(locks, [{ promptId, action, deviceId }]);
      const winner = decided.winners[0] === true;
      Object.assign(locks, decided.locks);
      const movedTo = winner ? screenAfter(action) : pressedOn;
      options.presses.record({
        promptId,
        action,
        deviceId,
        winner,
        screen: pressedOn,
        nextScreen: movedTo === pressedOn ? null : movedTo,
      });
      const lock = locks[promptId];
      if (!lock) return { ok: false, code: "invalid-state" };
      if (winner) applyWin(action, deviceId, option);
      persist();
      return { ok: true, winner, lock, action };
    },

    keeperLineEnded: (momentId, line) => {
      const beat = currentBeat();
      if (stage !== "playing" || finished || keeperLine === null) return false;
      if (momentId !== KEEPER_MOMENT_ID || beat?.storyboard?.id !== momentId) return false;
      if (line !== keeperLine) return false;
      if (keeperLine < KEEPER_LINE_COUNT - 1) keeperLine += 1;
      else advanceBeat();
      return true;
    },

    pickedOption: (momentId) => picked.get(momentId) ?? null,

    pressAll: (batch) => {
      const results: Array<PressOk | Fail> = [];
      // Once, before the batch: a lock the reading has already dropped must not decide it.
      reconcileTowerLocks();
      inBatch = true;
      try {
        for (const press of batch)
          results.push(engine.press(press.deviceId, press.promptId, press.action));
      } finally {
        inBatch = false;
      }
      return results;
    },

    projectStoryboard: (tower, join) => {
      reconcileTowerLocks();
      const beat = stage === "lobby" || finished ? undefined : currentBeat();
      const prompt = gameplayPrompt();
      const promptLock = prompt ? (locks[prompt.id] ?? null) : null;
      const unheld = unheldHunters().map((hunter) => hunter.id);
      return storyboardStatePayloadSchema.parse({
        screen,
        stage,
        hunters: hunters.map((hunter) => {
          const holders = holdersOf(hunter.id);
          return {
            id: hunter.id,
            name: hunter.name,
            holders,
            disconnected: holders.length > 0 && connectedHolders(hunter.id).length === 0,
          };
        }),
        join: join ? { code: options.joinCode, url: join.url, reachable: join.reachable } : null,
        prompt: prompt ? { id: prompt.id, label: prompt.label } : null,
        moment: beat?.storyboard ?? null,
        keeperLine,
        stories: storiesState(),
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
        screen,
        quitPromptId: screen === "play" ? "quit" : null,
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
        stories: storiesState(),
        lock: promptLock,
        won: promptLock ? promptLock.winnerDeviceId === deviceId : null,
        pick:
          prompt?.action === "pick" && beat?.pick && devices.get(deviceId)?.formFactor === "ipad"
            ? { momentId: beat.pick.momentId, prompt: beat.pick.prompt, options: beat.pick.options }
            : null,
      });
    },

    hunterRoster: () => hunters.map((hunter) => ({ ...hunter })),

    focusStory: (deviceId, storyId) => {
      if (!connectedDevice(deviceId)) return { ok: false, code: "unknown-device" };
      if (screen !== "pick-story" || !storyEntry(storyId)) {
        return { ok: false, code: "invalid-state" };
      }
      focusedStory = storyId;
      return { ok: true };
    },

    lockFor: (promptId) => {
      reconcileTowerLocks();
      return locks[promptId] ?? null;
    },

    pausePromptId: () => (stage === "playing" && !finished ? `pause-${pauseSerial + 1}` : null),

    screen: () => screen,

    finishSplash: () => {
      if (screen === "splash") screen = "tower-connect";
    },

    roster,

    close: () => {
      for (const deviceId of [...graceTimers.keys()]) cancelGrace(deviceId);
    },
  };

  return engine;
};
