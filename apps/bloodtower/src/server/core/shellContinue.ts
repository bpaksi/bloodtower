import type { ShellEvent } from "../../engine/loops/session/events.ts";
import type { ShellState } from "../../engine/loops/session/state.ts";
import { SHELL_ENGINE_VERSION } from "../../engine/loops/session/state.ts";
import { stepShell } from "../../engine/loops/session/stepShell.ts";
import { parseHostPayload } from "../events/kinds.ts";
import type { AppendEventInput, EventStore, GameMeta } from "../events/store.ts";
import { parseShellCheckpoint } from "./shellCheckpoint.ts";

export type ShellContinueInput = {
  gameId: string;
  packVersion: string;
  engineVersion: string;
  meta: GameMeta;
  atMonoMs: number;
  atWall: string;
};

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
    (event.promptId === "session-done-tonight" && event.actionId === "done-for-tonight"));

const applyShellEvents = (start: ShellState, events: readonly ShellEvent[]): ShellState => {
  let state = start;
  for (const event of events) {
    if (endsSittingReplay(event)) break;
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

  let state = parseShellCheckpoint(JSON.parse(checkpoint.stateJson) as unknown);

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
