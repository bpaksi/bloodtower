import type { TowerSnapshot } from "bloodtower-protocols";

export interface TowerSent {
  type: string;
}

/**
 * The tower port. `connect` and `calibrate` are explicit.
 * Nothing in this interface sends a cue, a command, or raw bytes.
 */
export interface TowerPort {
  snapshot: () => TowerSnapshot;
  connect: () => void;
  calibrate: () => void;
  close: () => void;
  sent: () => readonly TowerSent[];
  settled: () => Promise<void>;
}
