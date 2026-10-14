// The tower's four lifecycle actions and when the service allows each. Pure, so it is tested
// without React. The service refuses the others anyway; this spares the person the press.
import type { ConnectionPayload } from "tower-poc-protocols";

export type TowerAction = "connect" | "reconnect" | "disconnect" | "calibrate";

/**
 * Which of the four lifecycle actions the tower's state allows, as the service decides. Reconnect
 * is offered instead of Connect after the tower dropped the link by itself (D10): nothing
 * reconnects without a person pressing it.
 */
export const towerActions = (
  connection: ConnectionPayload | undefined,
): Record<TowerAction, boolean> => {
  const state = connection?.state;
  const canOpen =
    state === "disconnected" || state === "error" || state === "bluetooth-unavailable";
  const dropped = connection?.error?.code === "unexpected-disconnect";
  const connected = state === "connected";
  return {
    connect: canOpen && !dropped,
    reconnect: canOpen && dropped,
    disconnect: connected || state === "connecting",
    calibrate: connected && connection?.calibration !== "calibrating",
  };
};
