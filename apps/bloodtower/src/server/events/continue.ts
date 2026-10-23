import type { EngineEvent } from "../../engine/events.ts";
import { type EngineState, initialEngineState, step } from "../../engine/index.ts";
import { type CheckpointState, checkpointStateSchema, engineFromCheckpoint } from "./checkpoint.ts";
import { parseHostPayload } from "./kinds.ts";
import type { AppendEventInput, EventStore, GameMeta } from "./store.ts";

export type ContinueVersions = {
  engineVersion: string;
  packVersion: string;
};

export type ContinueResult = {
  state: EngineState;
  versionChangedLogged: boolean;
};

const engineEventsAfter = (store: EventStore, gameId: string, afterSeq: number): EngineEvent[] => {
  const rows = store.listEvents(gameId, afterSeq);
  const out: EngineEvent[] = [];
  for (const row of rows) {
    if (row.kind !== "engine") continue;
    const payload = parseHostPayload("engine", row.payload);
    out.push(payload.event);
  }
  return out;
};

const applyEngineEvents = (start: EngineState, events: readonly EngineEvent[]): EngineState => {
  let state = start;
  for (const event of events) {
    state = step(state, event).state;
  }
  return state;
};

export type ContinueInput = ContinueVersions & {
  gameId: string;
  meta: GameMeta;
  atMonoMs: number;
  atWall: string;
};

/**
 * DEC-208: load the last checkpoint, optionally log `version-changed`, then replay later engine events.
 * One autosave game id; no save slots.
 */
export const continueFromCheckpoint = (store: EventStore, input: ContinueInput): ContinueResult => {
  const checkpoint = store.lastCheckpoint(input.gameId);
  if (!checkpoint) {
    throw new Error(`No checkpoint for game ${input.gameId}.`);
  }

  const checkpointState = checkpointStateSchema.parse(
    JSON.parse(checkpoint.stateJson) as CheckpointState,
  );
  let state = engineFromCheckpoint(checkpointState);

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

  const pending = engineEventsAfter(store, input.gameId, checkpoint.afterEventSeq);
  state = applyEngineEvents(state, pending);
  return { state, versionChangedLogged };
};

/** Replays every engine event from the initial state (used in tests). */
export const replayAllEngineEvents = (store: EventStore, gameId: string): EngineState => {
  const events = engineEventsAfter(store, gameId, 0);
  return applyEngineEvents(initialEngineState(), events);
};
