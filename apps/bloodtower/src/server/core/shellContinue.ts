import type { ShellEvent } from "../../engine/loops/session/events.ts";
import { ensurePieceCheckOffers } from "../../engine/loops/session/pieceCheck.ts";
import type { ShellState } from "../../engine/loops/session/state.ts";
import { SHELL_ENGINE_VERSION } from "../../engine/loops/session/state.ts";
import { stepShell } from "../../engine/loops/session/stepShell.ts";
import { parseHostPayload } from "../events/kinds.ts";
import type { AppendEventInput, EventStore, GameMeta } from "../events/store.ts";
import type { HostLogger } from "../log/hostLog.ts";
import { parseShellCheckpoint } from "./shellCheckpoint.ts";

export type ShellContinueInput = {
  gameId: string;
  packVersion: string;
  engineVersion: string;
  meta: GameMeta;
  atMonoMs: number;
  atWall: string;
  /** Where a refused save is logged as an error. Optional so a caller with no log still throws. */
  log?: HostLogger;
};

/** The checkpoint cannot be read: an older save format, or damage. Continue offers a new game. */
export class SaveUnreadableError extends Error {
  readonly code = "save-unreadable";
  readonly gameId: string;
  constructor(gameId: string, detail: string) {
    super(`The save for game ${gameId} cannot be read: ${detail}`);
    this.name = "SaveUnreadableError";
    this.gameId = gameId;
  }
}

export type ShellContinueResult = {
  state: ShellState;
  versionChangedLogged: boolean;
};

const shellEventsAfter = (store: EventStore, gameId: string, afterSeq: number): ShellEvent[] => {
  const rows = store.listEvents(gameId, afterSeq);
  const out: ShellEvent[] = [];
  for (const row of rows) {
    if (row.kind !== "shell") continue;
    const payload = parseHostPayload("shell", row.payload);
    out.push(payload.event);
  }
  return out;
};

const endsSittingReplay = (event: ShellEvent): boolean =>
  event.kind === "press" &&
  (event.actionId === "quit-story" ||
    (event.promptId === "session-done-confirm" && event.actionId === "done-for-tonight"));

const applyShellEvents = (start: ShellState, events: readonly ShellEvent[]): ShellState => {
  let state = start;
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    if (!event) continue;
    if (endsSittingReplay(event)) {
      // If a later Continue started a piece check in this same game log (C2-11), reset transient
      // sitting state (pause, abandoned piece check) and keep replaying into the next sitting.
      // If this quit/done is terminal and abandoned an active piece check, clear that check so
      // a subsequent restart or Continue returns to play and starts a fresh piece check.
      const resumedLater = events.slice(i + 1).some((later) => later.kind === "piece-check-start");
      if (resumedLater) {
        state = {
          ...state,
          pieceCheck: null,
          pause: null,
          reconnect: null,
          screen: "play",
          stage: "playing",
        };
        continue;
      }
      if (state.pieceCheck !== null) {
        state = {
          ...state,
          pieceCheck: null,
          pause: null,
          reconnect: null,
          screen: "play",
          stage: "playing",
        };
      }
      break;
    }
    if (
      event.kind === "press" &&
      event.promptId === "continue-saved-game" &&
      event.actionId === "continue"
    ) {
      continue;
    }
    state = stepShell(state, event).state;
  }
  return state;
};

/** DEC-208: load the last checkpoint, optionally log version-changed, replay later shell events. */
export const continueShellFromCheckpoint = (
  store: EventStore,
  input: ShellContinueInput,
): ShellContinueResult => {
  const checkpoint = store.lastCheckpoint(input.gameId);
  if (!checkpoint) {
    throw new Error(`No checkpoint for game ${input.gameId}.`);
  }

  // DEC-895: a save from before named corruptions is refused, never migrated or backfilled.
  let state: ShellState;
  try {
    state = parseShellCheckpoint(JSON.parse(checkpoint.stateJson) as unknown);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    input.log?.error(
      "save-unreadable",
      `Game ${input.gameId} has a save Continue cannot read (engine ${checkpoint.engineVersion}): ${detail}`,
    );
    throw new SaveUnreadableError(input.gameId, detail);
  }

  const versionsDiffer =
    checkpoint.engineVersion !== input.engineVersion ||
    checkpoint.packVersion !== input.packVersion;

  let versionChangedLogged = false;
  if (versionsDiffer) {
    const append: AppendEventInput = {
      gameId: input.gameId,
      kind: "version-changed",
      payload: {
        v: 1,
        fromEngineVersion: checkpoint.engineVersion,
        toEngineVersion: input.engineVersion,
        fromPackVersion: checkpoint.packVersion,
        toPackVersion: input.packVersion,
      },
      atMonoMs: input.atMonoMs,
      atWall: input.atWall,
      deviceId: null,
      seed: input.meta.seed,
      packVersion: input.packVersion,
      engineVersion: input.engineVersion,
    };
    store.append(append);
    versionChangedLogged = true;
  }

  const pending = shellEventsAfter(store, input.gameId, checkpoint.afterEventSeq);
  state = applyShellEvents(state, pending);
  if (state.pieceCheck) {
    // An in-flight drum rotate never survives a restart: never deadlock step 5 or auto-resend.
    if (state.pieceCheck.drumsTurning) {
      state = {
        ...state,
        pieceCheck: { ...state.pieceCheck, drumsTurning: false, drumsTurned: false },
      };
    }
    if (state.screen === "piece-check") {
      ensurePieceCheckOffers(state);
    }
  }
  return { state, versionChangedLogged };
};

export const LOBBY_RESUME = new Set(["game-settings", "claim-heroes", "setup", "begin"]);

/**
 * The state the last session left, when its Enter had finished and the evening had not ended.
 * A checkpoint from before C2/05 has no Enter state, so it is not one (the Enter runs again).
 * A party setup saved before play comes back with it (W4).
 */
export const readSessionResume = (store: EventStore): ShellState | null => {
  const row = store.latestCheckpoint();
  if (!row) return null;
  const raw = JSON.parse(row.stateJson) as { enter?: unknown };
  if (raw.enter !== null) return null;
  const saved = parseShellCheckpoint(raw);
  if (saved.sessionEnded || saved.towerChoice === "undecided") return null;
  return saved;
};

export const shellEngineVersion = () => SHELL_ENGINE_VERSION;
