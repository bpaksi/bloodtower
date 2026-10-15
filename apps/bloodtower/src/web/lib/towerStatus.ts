import type { TowerSnapshot } from "bloodtower-protocols";

export interface TowerStatusLines {
  connection: string;
  battery: string;
  calibration: string;
}

/** Unknown stays the word unavailable. A known 0% is a real reading. */
export const towerStatusLines = (tower: TowerSnapshot): TowerStatusLines => ({
  connection: tower.connection,
  battery: tower.battery.state === "known" ? `${tower.battery.percent}%` : "unavailable",
  calibration:
    tower.calibrated.state === "unavailable"
      ? "unavailable"
      : tower.calibrated.calibrated
        ? "calibrated"
        : "not calibrated",
});
