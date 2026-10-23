export type TowerConnection = "unavailable" | "disconnected" | "connecting" | "connected";

export type TowerSnapshot = {
  connection: TowerConnection;
  calibrated: { state: "unavailable" } | { state: "known"; calibrated: boolean };
};

export const TOWER_DISCONNECTED: TowerSnapshot = {
  connection: "disconnected",
  calibrated: { state: "unavailable" },
};

export const TOWER_CONNECTED_UNCALIBRATED: TowerSnapshot = {
  connection: "connected",
  calibrated: { state: "known", calibrated: false },
};

export const TOWER_READY: TowerSnapshot = {
  connection: "connected",
  calibrated: { state: "known", calibrated: true },
};

export const towerReady = (tower: TowerSnapshot): boolean =>
  tower.connection === "connected" &&
  tower.calibrated.state === "known" &&
  tower.calibrated.calibrated;

export const towerLost = (tower: TowerSnapshot): boolean =>
  tower.connection === "disconnected" || tower.connection === "unavailable";
