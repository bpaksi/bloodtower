import {
  SHELL_ENGINE_VERSION,
  type ShellState,
  SUPPORTED_CHECKPOINT_VERSIONS,
} from "../../engine/loops/session/state.ts";
import {
  deserializeShellState,
  type SerializedShellState,
  serializeShellState,
} from "./serialize.ts";

export type ShellCheckpointState = SerializedShellState & {
  version: string;
};

export const shellCheckpointFromState = (state: ShellState): ShellCheckpointState =>
  serializeShellState(state);

export const shellFromCheckpoint = (checkpoint: ShellCheckpointState): ShellState =>
  deserializeShellState(checkpoint);

export const parseShellCheckpoint = (value: unknown): ShellState => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Checkpoint state must be an object.");
  }
  const row = value as ShellCheckpointState;
  if (!SUPPORTED_CHECKPOINT_VERSIONS.includes(row.version)) {
    throw new Error(`Checkpoint engine version ${String(row.version)} is not supported.`);
  }
  return deserializeShellState(row);
};
