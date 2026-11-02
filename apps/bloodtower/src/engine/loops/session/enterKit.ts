import type { ShellEvent } from "./events.ts";
import { TOWER_READY } from "./tower.ts";

/**
 * The events that run the session Enter (MEC-039) for tests and the simulator:
 * the first iPad joins, the board is set up, then the tower choice.
 * The connect track also feeds the results a host appends after each tower command.
 */
export const enterWithoutEvents = (deviceId = "ipad-0"): ShellEvent[] => [
  { kind: "device-join", v: 1, deviceId },
  { kind: "press", v: 1, deviceId, promptId: "base-board-done", actionId: "board-set-up" },
  {
    kind: "press",
    v: 1,
    deviceId,
    promptId: "play-without-tower",
    actionId: "play-without-tower",
  },
];

export const enterConnectEvents = (deviceId = "ipad-0"): ShellEvent[] => [
  { kind: "device-join", v: 1, deviceId },
  { kind: "press", v: 1, deviceId, promptId: "base-board-done", actionId: "board-set-up" },
  { kind: "press", v: 1, deviceId, promptId: "tower-connect", actionId: "tower-connect" },
  { kind: "tower-result", v: 1, capabilityId: "tower.connect", ok: true },
  { kind: "press", v: 1, deviceId, promptId: "tower-calibrate", actionId: "tower-calibrate" },
  { kind: "tower-result", v: 1, capabilityId: "tower.calibrate", ok: true },
  { kind: "tower-snapshot", v: 1, tower: TOWER_READY },
];
