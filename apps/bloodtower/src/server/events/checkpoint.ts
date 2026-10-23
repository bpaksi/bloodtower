import type { LoopRuntimeState } from "../../engine/loop/runtime.ts";
import {
  ENGINE_VERSION,
  type EngineMode,
  type EngineState,
  initialEngineState,
} from "../../engine/state.ts";

/** Serializable engine state for a checkpoint row (no loop registry). */
export type CheckpointState = {
  version: string;
  mode: EngineMode;
  seed: string;
  eventSeq: number;
  loops: LoopRuntimeState;
};

export const checkpointStateFromEngine = (state: EngineState): CheckpointState => ({
  version: state.version,
  mode: state.mode,
  seed: state.seed,
  eventSeq: state.eventSeq,
  loops: state.loops,
});

const parseCheckpointState = (value: unknown): CheckpointState => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Checkpoint state must be an object.");
  }
  const row = value as CheckpointState;
  if (typeof row.version !== "string" || row.version.length === 0) {
    throw new Error("Checkpoint state needs version.");
  }
  if (row.mode !== "idle" && row.mode !== "test-loop") {
    throw new Error("Checkpoint state needs mode.");
  }
  if (typeof row.seed !== "string") throw new Error("Checkpoint state needs seed.");
  if (!Number.isInteger(row.eventSeq) || row.eventSeq < 0) {
    throw new Error("Checkpoint state needs eventSeq.");
  }
  if (typeof row.loops !== "object" || row.loops === null) {
    throw new Error("Checkpoint state needs loops.");
  }
  return row;
};

export const checkpointStateSchema = {
  parse: (value: unknown) => parseCheckpointState(value),
};

export const engineFromCheckpoint = (checkpoint: CheckpointState): EngineState => ({
  ...parseCheckpointState(checkpoint),
  version: ENGINE_VERSION,
  registry: initialEngineState().registry,
});
