import type { VolumeTest } from "bloodtower-protocols";
import type { TowerPort } from "./types.ts";

/** Dungeon Complete (#58): the one sound the volume test plays (Proving Ground section 6a). */
export const VOLUME_TEST_SOUND = 58;
/** The volume tiers tried, in order. Labels stay neutral until GAP-HW-003 is answered. */
export const VOLUME_LEVELS = [0, 1, 2] as const;
/** The wait after each write, before anything else is sent to the tower (section 6). */
export const WRITE_GAP_MS = 250;
/** From one sound starting to the next, about. The sound's end is never awaited. */
export const LEVEL_SPACING_MS = 4000;
/** The room sound alone, before the tower plays over it. */
export const BALANCE_LEAD_MS = 3000;
/** The host's chosen tier for the balance check. There is no volume picker yet (R3-UI-63): quiet. */
export const BALANCE_TIER = 2;

export interface VolumeRunHooks {
  /** The run moved to a phase. `level` is set only for `levels`. */
  progress: (phase: VolumeTest["phase"], level: 0 | 1 | 2 | null) => void;
  /** A tower sound did not play. The run stops; nothing is retried. */
  failed: () => void;
  /** False once the run was left behind (Back, a newer run, the host closing). */
  live: () => boolean;
}

export interface VolumeRunInput {
  port: TowerPort;
  withBalance: boolean;
  hooks: VolumeRunHooks;
  sleep: (ms: number) => Promise<void>;
}

/**
 * Plays the tower volume test, one command at a time. After each write it waits 250 ms before
 * anything else goes out, and it starts the next sound about 4 s after the last, because the
 * tower does not report when a sound ends. No lights are sent. A failed sound ends the run.
 * Call it only after the winning press that asked for it.
 */
export const runVolumeTest = async (input: VolumeRunInput): Promise<void> => {
  const { port, hooks, sleep } = input;
  const play = async (volume: number): Promise<boolean> => {
    const result = await port.playSound(VOLUME_TEST_SOUND, volume);
    if (result === "failed") {
      if (hooks.live()) hooks.failed();
      return false;
    }
    await sleep(WRITE_GAP_MS);
    return true;
  };

  for (const level of VOLUME_LEVELS) {
    if (!hooks.live()) return;
    hooks.progress("levels", level);
    if (!(await play(level))) return;
    // Hold on the level while it plays, then move on.
    await sleep(LEVEL_SPACING_MS - WRITE_GAP_MS);
  }

  if (input.withBalance) {
    if (!hooks.live()) return;
    hooks.progress("balance-bed", null);
    await sleep(BALANCE_LEAD_MS);
    if (!hooks.live()) return;
    hooks.progress("balance-tower", null);
    if (!(await play(BALANCE_TIER))) return;
    await sleep(LEVEL_SPACING_MS - WRITE_GAP_MS);
  }

  if (!hooks.live()) return;
  hooks.progress("asking", null);
};
