// The only path from a client to the tower (spec §3.1, FR-07, D7, D21, D22, D23).
//
// Every command runs in one lane, one at a time, in the order the service received them. The
// library has its own queue, but `allLightsOn`, `allLightsOff` and `sendTowerState` skip it, so
// only a lane above the library keeps every write in order. A command that is waiting holds no
// library call; a command that is running holds the lane until the library settles it.
//
// Nothing here is sent twice. A command that fails, times out or gets no answer ends its lifecycle
// and is not tried again.

import type { UltimateDarkTower } from "ultimatedarktower";
import { TOWER_LIGHT_SEQUENCES } from "ultimatedarktowerdata";
import {
  type CapabilityParams,
  type CommandableId,
  type CommandLifecyclePayload,
  type ConnectionPayload,
  findCapability,
  type LifecycleStage,
  type lightEffectSchema,
  RANDOM_ROTATE_DRUMS,
  SILENT_LIGHT_SEQUENCES,
  type ValidatedCommand,
  validateCommand,
} from "./protocols/index.ts";
import { flashOneLight } from "./timing/flashLight.ts";
import type { TowerRecords } from "./towerRecords.ts";

/** What the executor needs from the session. `TowerSession` has all of it. */
export interface ExecutorSession {
  status: () => ConnectionPayload;
  tower: () => UltimateDarkTower | undefined;
  writes: () => number;
  onTowerReport: (listener: () => void) => () => void;
}

export interface CommandRequest {
  /** The `command` message's envelope id. */
  commandId: string;
  clientId: string;
  capabilityId: string;
  /** As the client sent it. Nothing reads it before `validateCommand`. */
  params: unknown;
}

export interface CommandExecutorOptions {
  session: ExecutorSession;
  /** Every stage of every command, for every client (D7). */
  onLifecycle: (payload: CommandLifecyclePayload) => void;
  /** The service's own record of seals and skulls (spec D24). */
  records: TowerRecords;
  now?: () => number;
}

export interface CommandExecutor {
  /** Validates and queues a command. Resolves when its lifecycle has ended. */
  submit: (request: CommandRequest) => Promise<void>;
  /** The same, for a command `validateCommand` has already passed. */
  run: (request: Omit<CommandRequest, "params">, command: ValidatedCommand) => Promise<void>;
  /**
   * True while a command is waiting or running, including the spacing after its last write. The
   * service refuses to calibrate until it is false. A command that ended `timed-out` no longer
   * counts, though the library call it stopped waiting for may still write.
   */
  busy: () => boolean;
}

/** The library waits this long for the tower to answer a queued command, then rejects it. */
export const LIBRARY_COMMAND_TIMEOUT_MS = 30_000;
/** Past the library's own limit, so that the library is the one to give up first. */
const QUEUED_TIMEOUT_MS = LIBRARY_COMMAND_TIMEOUT_MS + 5_000;
/** A write that skips the library's queue waits for nothing but the write itself. */
const DIRECT_TIMEOUT_MS = 5_000;
/** The tower echoed lights and sounds 25 to 64 ms after the write in the M1 spike. */
export const CONFIRM_WINDOW_MS = 1_000;
/**
 * The library leaves this much between a response and its next queued write. A write that skips
 * its queue gets the same space here.
 */
export const MIN_COMMAND_GAP_MS = 250;
/** Commands waiting behind the running one. More than this is a client gone wrong. */
export const MAX_WAITING = 20;

/**
 * - `queue`: the library sends it through its queue, which settles when the tower answers.
 * - `direct`: the library writes it at once and settles when the write completes.
 * - `local`: the service changes its own record; neither the tower nor the library is involved
 *   (spec D24), so it needs no connected tower.
 */
interface TowerHooks {
  /** The first time a plan writes, so a long burst can record that moment before it ends. */
  onWrite?: () => void;
}
interface TowerPlan {
  path: "queue" | "direct";
  timeoutMs: number;
  /** The tower is known not to answer it (GAP-HW-010). */
  silent?: boolean;
  run: (tower: UltimateDarkTower, hooks?: TowerHooks) => Promise<void> | void;
  /** Changes the service's record once the tower has confirmed the command, and only then. */
  onConfirmed?: (records: TowerRecords) => void;
}
interface LocalPlan {
  path: "local";
  run: (records: TowerRecords) => void;
}
type Plan = TowerPlan | LocalPlan;

const queued = (
  run: TowerPlan["run"],
  packets = 1,
  onConfirmed?: TowerPlan["onConfirmed"],
): Plan => ({
  path: "queue",
  timeoutMs: QUEUED_TIMEOUT_MS * packets,
  run,
  ...(onConfirmed ? { onConfirmed } : {}),
});
const direct = (run: TowerPlan["run"], silent = false, timeoutMs = DIRECT_TIMEOUT_MS): Plan => ({
  path: "direct",
  timeoutMs,
  silent,
  run,
});
const local = (run: LocalPlan["run"]): Plan => ({ path: "local", run });

/**
 * The library's `LIGHT_EFFECTS`, by the inventory's names. Its own table is typed so that a lookup
 * may be undefined, which the library would quietly take as its default; a test checks the two
 * tables agree.
 */
export const LIGHT_EFFECT_NUMBERS = {
  off: 0,
  on: 1,
  breathe: 2,
  breatheFast: 3,
  breathe50percent: 4,
  flicker: 5,
} as const satisfies Record<(typeof lightEffectSchema)["options"][number], number>;

const isSilent = (sequence: string) =>
  (SILENT_LIGHT_SEQUENCES as readonly string[]).includes(sequence);

/**
 * Plays a light sequence the tower does not answer (D23). It is the library's own current state
 * with only the sequence changed, written straight to the tower, so nothing waits 30 seconds for
 * an answer that never comes. `sendTowerState` clears the audio byte as it sends.
 */
export const sendSilentSequence = async (
  tower: UltimateDarkTower,
  sequence: keyof typeof TOWER_LIGHT_SEQUENCES,
) => {
  const state = tower.getCurrentTowerState();
  await tower.sendTowerState({ ...state, led_sequence: TOWER_LIGHT_SEQUENCES[sequence] });
};

/**
 * One entry per commandable capability, with the parsed params the schema produced. Names from
 * the inventory are turned into the library's numbers here and nowhere else.
 */
const PLANS: { [Id in CommandableId]: (params: CapabilityParams<Id>) => Plan } = {
  "lighting.set": (params) => queued((tower) => tower.lights(params)),
  "lighting.all-on": (params) =>
    direct((tower) => tower.allLightsOn(LIGHT_EFFECT_NUMBERS[params.effect ?? "on"])),
  "lighting.all-off": () => direct((tower) => tower.allLightsOff()),
  "lighting.sequence": (params) =>
    isSilent(params.sequence)
      ? direct((tower) => sendSilentSequence(tower, params.sequence), true)
      : queued((tower) =>
          tower.lightOverrides(TOWER_LIGHT_SEQUENCES[params.sequence], params.soundIndex),
        ),
  "lighting.set-led": (params) =>
    queued((tower) =>
      tower.setLED(
        params.layerIndex,
        params.lightIndex,
        LIGHT_EFFECT_NUMBERS[params.effect],
        params.loop,
      ),
    ),
  // One command for the whole burst. The writes inside it skip the library queue and the
  // lane's 250 ms gap, or 8 flashes a second could not happen. The gap still applies after.
  "lighting.flash": (params) =>
    direct(
      (tower, hooks) =>
        flashOneLight(tower, params, {
          now: Date.now,
          sleep,
          onWrite: () => hooks?.onWrite?.(),
        }),
      false,
      params.durationMs + 2_000,
    ),
  "sound.play": (params) => queued((tower) => tower.playSound(params.soundIndex)),
  "sound.play-stateful": (params) =>
    queued((tower) => tower.playSoundStateful(params.soundIndex, false, params.volume)),
  // With a sound the library sends two packets, one after the other: the rotation, then the sound.
  "mechanics.rotate-with-state": (params) =>
    queued(
      (tower) => tower.rotateWithState(params.top, params.middle, params.bottom, params.soundIndex),
      params.soundIndex === undefined ? 1 : 2,
    ),
  "mechanics.rotate-drum": (params) =>
    queued((tower) =>
      tower.rotateDrumStateful(params.drumIndex, params.position, params.playSound),
    ),
  "mechanics.random-rotate": (params) =>
    queued((tower) => tower.randomRotateLevels(RANDOM_ROTATE_DRUMS[params.drums])),
  // The library records the seal in its own set as well; that set is not read (spec D24).
  "seals.break": (params) =>
    queued(
      (tower) => tower.breakSeal(params.seal),
      1,
      (records) => records.markSeal(params.seal, true),
    ),
  "seals.mark-broken": (params) => local((records) => records.markSeal(params.seal, true)),
  "seals.mark-restored": (params) => local((records) => records.markSeal(params.seal, false)),
  "seals.reset": () => local((records) => records.resetSeals()),
  // The tower's own counter. The app's count has its own reset and is not changed here.
  "skulls.reset-count": () => queued((tower) => tower.resetTowerSkullCount()),
  "skulls.reset-record": () => local((records) => records.resetSkulls()),
};

/** The ids the executor has a plan for. A test checks they are exactly the commandable ones. */
export const PLANNED_IDS = Object.keys(PLANS);
/**
 * The ids whose plan changes only the service's record. A test checks they are exactly the
 * inventory's `serviceOnly` ones, since `refusal` skips the tower's checks by that flag. Read from
 * the plans with empty params: a local plan does not look at them until it runs.
 */
export const LOCAL_IDS = PLANNED_IDS.filter(
  (id) => (PLANS[id as CommandableId] as (params: unknown) => Plan)({}).path === "local",
);

const planFor = (command: ValidatedCommand): Plan =>
  // The one place the id and its params are put back together. `validateCommand` parsed `params`
  // with this id's schema, which TypeScript cannot follow through the brand.
  (PLANS[command.capabilityId] as (params: unknown) => Plan)(command.params);

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));
const limit = (text: string) => (text.length > 500 ? `${text.slice(0, 499)}…` : text);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Outcome = { kind: "done" } | { kind: "error"; error: unknown } | { kind: "timeout" };

/** Runs `call`, and stops waiting for it after `ms`. A late result is dropped. */
const settle = (call: () => Promise<void> | void, ms: number): Promise<Outcome> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ kind: "timeout" }), ms);
    Promise.resolve()
      .then(call)
      .then(
        () => resolve({ kind: "done" }),
        (error: unknown) => resolve({ kind: "error", error }),
      )
      .finally(() => clearTimeout(timer));
  });

const REJECTIONS = {
  "unknown-capability": "No capability has this id.",
  "not-commandable": "This capability cannot be sent as a command.",
  "invalid-params": "The parameters are not valid.",
} as const;

export const createCommandExecutor = (options: CommandExecutorOptions): CommandExecutor => {
  const { session, onLifecycle, records } = options;
  const now = options.now ?? Date.now;
  let tail: Promise<void> = Promise.resolve();
  let waiting = 0;
  /** Waiting plus running. */
  let inLane = 0;
  // The tower object a silent sequence was last sent on, until the tower next reports its state.
  // The library keeps that sequence in the state it builds every packet from, and only a report
  // from the tower resets it; until then each packet would ask the tower to play it again.
  let unclearedSequence: UltimateDarkTower | undefined;
  session.onTowerReport(() => {
    unclearedSequence = undefined;
  });

  const report = (
    request: Omit<CommandRequest, "params">,
    stage: LifecycleStage,
    extra: Pick<CommandLifecyclePayload, "reason" | "issues" | "written"> = {},
  ) =>
    onLifecycle({
      commandId: request.commandId,
      capabilityId: request.capabilityId,
      clientId: request.clientId,
      stage,
      at: now(),
      ...(extra.reason ? { reason: limit(extra.reason) } : {}),
      ...(extra.issues ? { issues: extra.issues } : {}),
      ...(extra.written === false ? { written: false as const } : {}),
    });

  /** Why the command cannot run now, or undefined when it can. Checked on arrival and on start. */
  const refusal = (command: ValidatedCommand): string | undefined => {
    // It changes the service's own record only (spec D24), so the tower's state does not matter.
    if (findCapability(command.capabilityId)?.serviceOnly) return undefined;
    const status = session.status();
    const tower = session.tower();
    if (status.state !== "connected" || !tower) return "The tower is not connected.";
    // D22: the library would drop the command and still report it as sent.
    if (status.calibration === "calibrating" || tower.performingCalibration) {
      return "The tower is calibrating. Send the command again when calibration has finished.";
    }
    const calibrated = status.calibration === "calibrated";
    if (findCapability(command.capabilityId)?.availability === "requires-calibration") {
      if (!calibrated) return "This needs a calibrated tower (D9). Calibrate it first.";
    }
    const params = command.params as { sequence?: unknown; soundIndex?: unknown };
    if (command.capabilityId === "lighting.sequence" && typeof params.sequence === "string") {
      if (isSilent(params.sequence) && !calibrated) {
        return "This light sequence has only been tried on a calibrated tower (D23). Calibrate it first.";
      }
      // It is sent with `sendTowerState`, which clears the audio byte, so the sound would be lost.
      if (isSilent(params.sequence) && params.soundIndex !== undefined) {
        return "This light sequence cannot play a sound with it (D23). Send the sound on its own.";
      }
    }
    return undefined;
  };

  /**
   * Writes the state once more without the silent sequence, before anything else is sent. The
   * mark stays until that write succeeds, so a clear that fails is tried again before the next
   * command, never skipped.
   */
  const clearSilentSequence = async (tower: UltimateDarkTower) => {
    if (unclearedSequence !== tower) return false;
    const state = tower.getCurrentTowerState();
    if (state.led_sequence !== 0) await tower.sendTowerState({ ...state, led_sequence: 0 });
    unclearedSequence = undefined;
    return state.led_sequence !== 0;
  };

  /** Changes the service's record. It runs at once and sends nothing. */
  const executeLocal = (request: Omit<CommandRequest, "params">, plan: LocalPlan) => {
    report(request, "started");
    try {
      plan.run(records);
    } catch (error) {
      return report(request, "failed", { reason: describe(error) });
    }
    report(request, "confirmed", {
      reason: "Recorded by the service; nothing is sent to the tower (spec D24).",
    });
  };

  const execute = async (request: Omit<CommandRequest, "params">, command: ValidatedCommand) => {
    const why = refusal(command);
    const plan = planFor(command);
    if (why) return report(request, "rejected", { reason: why });
    if (plan.path === "local") return executeLocal(request, plan);
    const tower = session.tower();
    if (!tower) return report(request, "rejected", { reason: "The tower is not connected." });
    report(request, "started");

    const firstWrite = session.writes();
    let reported = false;
    let onReport: (() => void) | undefined;
    const stopListening = session.onTowerReport(() => {
      reported = true;
      onReport?.();
    });
    const nextReport = (ms: number) =>
      reported
        ? Promise.resolve(true)
        : new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(false), ms);
            onReport = () => {
              clearTimeout(timer);
              resolve(true);
            };
          });

    try {
      // Every plan that writes needs this, the direct ones too: `allLightsOn` and the others
      // build their packet from the same library state.
      try {
        if (await clearSilentSequence(tower)) await sleep(MIN_COMMAND_GAP_MS);
      } catch (error) {
        return report(request, "failed", {
          reason: `Could not clear the previous light sequence, so nothing else was sent: ${describe(error)}`,
        });
      }
      const before = session.writes();
      reported = false;
      // Marked before sending: `sendTowerState` records the sequence in the library's state
      // before it writes, so even a send that fails or times out leaves it there.
      if (plan.silent) unclearedSequence = tower;
      let notedWrite = false;
      const outcome = await settle(
        () =>
          plan.run(tower, {
            onWrite: () => {
              if (notedWrite) return;
              notedWrite = true;
              report(request, "write-completed");
            },
          }),
        plan.timeoutMs,
      );
      const wrote = session.writes() > before;

      if (outcome.kind === "timeout") {
        return report(request, "timed-out", {
          reason: `The library did not finish within ${plan.timeoutMs / 1000} s. Nothing was sent again.`,
        });
      }
      if (outcome.kind === "error") {
        const message = describe(outcome.error);
        // The library's queue rejects this way only after the write went out (GAP-HW-010).
        if (/Command timeout after/.test(message) && wrote) {
          report(request, "write-completed");
          return report(request, "indeterminate", {
            reason: `The command was written and the tower sent no state back within ${LIBRARY_COMMAND_TIMEOUT_MS / 1000} s (GAP-HW-010).`,
          });
        }
        if (session.status().state !== "connected") {
          return report(request, "failed", {
            reason: `The connection ended before the command finished: ${message}`,
          });
        }
        return report(request, "failed", { reason: message });
      }

      if (!wrote) {
        return report(request, "indeterminate", {
          reason:
            "The library sent nothing to the tower: by its own record the tower was already in that state.",
          written: false,
        });
      }
      // A burst records this at its first packet. Reporting it again would look like a second send.
      if (!notedWrite) report(request, "write-completed");
      if (plan.path === "queue") {
        plan.onConfirmed?.(records);
        return report(request, "confirmed");
      }
      if (plan.silent) {
        return report(request, "indeterminate", {
          reason: "The tower does not answer this light sequence (GAP-HW-010).",
        });
      }
      return (await nextReport(CONFIRM_WINDOW_MS))
        ? report(request, "confirmed")
        : report(request, "indeterminate", {
            reason: `The tower sent no state back within ${CONFIRM_WINDOW_MS / 1000} s. It stays silent when nothing changes (GAP-HW-010).`,
          });
    } finally {
      stopListening();
      if (session.writes() > firstWrite) await sleep(MIN_COMMAND_GAP_MS);
    }
  };

  const run: CommandExecutor["run"] = (request, command) => {
    const why = refusal(command);
    if (why) {
      report(request, "rejected", { reason: why });
      return Promise.resolve();
    }
    if (waiting >= MAX_WAITING) {
      report(request, "rejected", {
        reason: `${MAX_WAITING} commands are already waiting. Send it again when the tower has caught up.`,
      });
      return Promise.resolve();
    }
    waiting += 1;
    inLane += 1;
    report(request, "queued");
    const done = tail.then(() => {
      waiting -= 1;
      return execute(request, command).finally(() => {
        inLane -= 1;
      });
    });
    tail = done.catch((error: unknown) => {
      // `execute` reports its own failures, so this is a bug in the service.
      console.error("Command executor failed:", error);
    });
    return tail;
  };

  return {
    run,
    busy: () => inLane > 0,
    submit: (request) => {
      const validation = validateCommand(request.capabilityId, request.params);
      if (!validation.ok) {
        report(request, "rejected", {
          reason: REJECTIONS[validation.reason],
          ...(validation.issues.length > 0 ? { issues: validation.issues } : {}),
        });
        return Promise.resolve();
      }
      return run(request, validation.command);
    },
  };
};
