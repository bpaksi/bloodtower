import { createShellRegistry } from "../../engine/loops/session/registry.ts";
import type { ShellState } from "../../engine/loops/session/state.ts";

/** JSON-safe shell state for checkpoint rows (no registry, devices as a list). */
export type SerializedShellState = Omit<ShellState, "devices" | "registry"> & {
  devices: string[];
};

export const serializeShellState = (state: ShellState): SerializedShellState => {
  const { devices, registry: _registry, ...rest } = state;
  return { ...rest, devices: [...devices] };
};

export const deserializeShellState = (row: SerializedShellState): ShellState => ({
  ...row,
  devices: new Set(row.devices),
  registry: createShellRegistry(),
});
