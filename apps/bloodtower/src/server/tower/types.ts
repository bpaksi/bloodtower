import type { TowerSnapshot } from "bloodtower-protocols";

export interface TowerSent {
  type: string;
  /** For `sound`: the library sound index and the volume tier 0..3. */
  soundIndex?: number;
  volume?: number;
}

/** How one tower sound ended. `written` means the write completed; no sound end is awaited. */
export type SoundResult = "written" | "failed";

/**
 * The tower port. `connect` and `calibrate` are explicit, and so is `playSound`.
 * Nothing in this interface sends a light cue, any other command, or raw bytes.
 */
export interface TowerPort {
  snapshot: () => TowerSnapshot;
  /** `failed` when the tower did not answer. Nothing retries. */
  connect: () => SoundResult;
  calibrate: () => SoundResult;
  /**
   * Plays one library sound at a volume tier (0 loudest .. 3 mute) through tower-poc's
   * `sound.play-stateful` command. Resolves once the write is done or the command failed. It never
   * waits for the sound to end, because the tower does not report that. It is never retried.
   */
  playSound: (soundIndex: number, volume: number) => Promise<SoundResult>;
  close: () => void;
  sent: () => readonly TowerSent[];
  settled: () => Promise<void>;
}
