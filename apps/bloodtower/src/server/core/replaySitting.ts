import { type ShellEffect, shellEffectSchema } from "../../engine/loops/session/effects.ts";
import type { ShellState } from "../../engine/loops/session/state.ts";
import { stepShell } from "../../engine/loops/session/stepShell.ts";
import { parseHostPayload } from "../events/kinds.ts";
import type { EventStore } from "../events/store.ts";
import type { HostLogger } from "../log/hostLog.ts";
import type { BloodtowerTower } from "../tower/host.ts";
import { runShellEffects } from "./effects.ts";
import { parseShellCheckpoint } from "./shellCheckpoint.ts";

export type ReplaySittingResult = {
  skippedTowerCommands: number;
};

/**
 * Replays the autosave log after its last checkpoint.
 * Tower commands and the quit record are applied with `replaying` set, so Done for tonight
 * does not send `lighting.all-off` again and does not write a second quit record.
 * Throws when there is no checkpoint: a replay that skipped nothing must not pass.
 */
export const replaySittingLog = async (
  store: EventStore,
  tower: BloodtowerTower,
  log: HostLogger,
): Promise<ReplaySittingResult> => {
  const saved = store.getAutosave();
  if (!saved) throw new Error("No autosave to replay.");
  const checkpoint = store.lastCheckpoint(saved.gameId);
  if (!checkpoint) throw new Error(`No checkpoint for game ${saved.gameId}.`);

  let state: ShellState = parseShellCheckpoint(JSON.parse(checkpoint.stateJson) as unknown);
  const rows = store.listEvents(saved.gameId, checkpoint.afterEventSeq);
  let skippedTowerCommands = 0;

  for (const row of rows) {
    if (row.kind !== "shell") continue;
    const { event } = parseHostPayload("shell", row.payload);
    const result = stepShell(state, event);
    state = result.state;
    const suppressed: ShellEffect[] = [];
    for (const effect of result.effects) {
      const parsed = shellEffectSchema.safeParse(effect);
      if (!parsed.success) continue;
      if (parsed.data.kind === "tower-command") {
        skippedTowerCommands += 1;
        suppressed.push(parsed.data);
      } else if (parsed.data.kind === "game-record") {
        suppressed.push(parsed.data);
      }
    }
    await runShellEffects(state, suppressed, {
      store,
      tower,
      log,
      sessionId: state.sessionId,
      clock: { monoMs: () => row.atMonoMs, wall: () => row.atWall },
      meta: {
        seed: row.seed,
        packVersion: row.packVersion,
        engineVersion: row.engineVersion,
      },
      onViewRefresh: () => {},
      replaying: true,
    });
  }

  return { skippedTowerCommands };
};
