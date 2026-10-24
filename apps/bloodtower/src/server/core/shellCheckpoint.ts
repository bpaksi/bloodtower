import { SHELL_ENGINE_VERSION, type ShellState } from "../../engine/loops/session/state.ts";
import {
  deserializeShellState,
  type SerializedShellState,
  serializeShellState,
} from "./serialize.ts";

export type ShellCheckpointState = SerializedShellState & {
  version: typeof SHELL_ENGINE_VERSION;
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
  if (row.version !== SHELL_ENGINE_VERSION) {
    throw new Error(`Checkpoint engine version ${String(row.version)} is not supported.`);
  }
  return deserializeShellState(row);
};
