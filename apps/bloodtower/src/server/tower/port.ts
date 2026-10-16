import type { ControlAction } from "bloodtower-protocols";
import type { TowerPort } from "./types.ts";

export type { TowerPort } from "./types.ts";

/**
 * A winning tower press is the only thing that reaches the port.
 * A losing press, a story press, and any other action do not.
 * There is no cue method.
 */
export const runTowerPress = (
  result: { ok: true; winner: boolean; action: ControlAction } | { ok: false },
  port: TowerPort,
): void => {
  if (!result.ok || !result.winner) return;
  if (result.action === "tower-connect") port.connect();
  else if (result.action === "tower-calibrate") port.calibrate();
};
