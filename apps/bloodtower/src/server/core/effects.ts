import { randomBytes } from "node:crypto";
import type { ShellEffect } from "../../engine/loops/session/effects.ts";
import type { ShellState } from "../../engine/loops/session/state.ts";
import { activeMsOf, latestRecordOf, startedWallOf, tapCounts } from "../events/gameStats.ts";
import type { GameRecordPayloadV1 } from "../events/kinds.ts";
import type { EventStore } from "../events/store.ts";
import type { HostLogger } from "../log/hostLog.ts";
import type { Clock } from "../timing/clock.ts";
import type { BloodtowerTower } from "../tower/host.ts";
import { shellCheckpointFromState } from "./shellCheckpoint.ts";

export type EffectsContext = {
  store: EventStore;
  tower: BloodtowerTower;
  log: HostLogger;
  sessionId: string;
  clock: Clock;
  meta: { seed: string; packVersion: string; engineVersion: string };
  onViewRefresh: () => void;
  /** When true, tower commands are not sent (event replay). */
  replaying?: boolean;
};

/** How a tower command the effects sent ended. The caller feeds it back to the engine. */
export type TowerOutcome = { capabilityId: string; result: "ok" | "failed" };

export const runShellEffects = async (
  state: ShellState,
  effects: readonly ShellEffect[],
  ctx: EffectsContext,
): Promise<TowerOutcome[]> => {
  const outcomes: TowerOutcome[] = [];
  for (const effect of effects) {
    switch (effect.kind) {
      case "view-refresh":
        ctx.onViewRefresh();
        break;
      case "autosave-write": {
        const row = state.autosave;
        if (!row) break;
        ctx.store.replaceAutosave({
          gameId: row.gameId,
          sessionId: ctx.sessionId,
          packId: row.packId,
        });
        break;
      }
      case "game-record": {
        if (ctx.replaying) break;
        const rows = ctx.store.listEvents(effect.gameId);
        // A quit, Continue, then the final outcome are rows in the log and the latest is the
        // record (PT-03). The same outcome again with nothing new (no press, no play time, same
        // day) writes nothing: a second Quit right after Continue is one record (DEC-218).
        const last = latestRecordOf(rows);
        const payload: GameRecordPayloadV1 = {
          v: 1,
          gameId: effect.gameId,
          outcome: effect.outcome,
          storyId: effect.storyId ?? null,
          length: effect.length ?? null,
          difficulty: effect.difficulty ?? null,
          partySize: effect.partySize ?? null,
          heroIds: effect.heroIds ?? [],
          ...(effect.how ? { how: effect.how } : {}),
          sceneId: effect.sceneId ?? null,
          endDay: effect.endDay ?? null,
          startedWall: startedWallOf(rows),
          endedWall: ctx.clock.wall(),
          activeMs: activeMsOf(rows),
          taps: tapCounts(rows).total,
          ...(effect.stats ? { stats: effect.stats } : {}),
        };
        if (
          last &&
          last.outcome === payload.outcome &&
          last.taps === payload.taps &&
          last.activeMs === payload.activeMs &&
          last.endDay === payload.endDay
        ) {
          break;
        }
        ctx.store.append({
          gameId: effect.gameId,
          kind: "game-record",
          payload,
          atMonoMs: ctx.clock.monoMs(),
          atWall: ctx.clock.wall(),
          deviceId: null,
          seed: ctx.meta.seed,
          packVersion: ctx.meta.packVersion,
          engineVersion: ctx.meta.engineVersion,
        });
        // A finished game clears the autosave, so Continue is not offered for it (DEC-208).
        if (effect.outcome !== "quit" && ctx.store.getAutosave()?.gameId === effect.gameId) {
          ctx.store.clearAutosave();
        }
        break;
      }
      case "checkpoint-write": {
        const afterSeq = ctx.store.nextSeq(effect.gameId) - 1;
        ctx.store.writeCheckpoint({
          gameId: effect.gameId,
          day: effect.day,
          afterEventSeq: Math.max(0, afterSeq),
          stateJson: JSON.stringify(shellCheckpointFromState(state)),
          atMonoMs: ctx.clock.monoMs(),
          atWall: ctx.clock.wall(),
          // Play again gives the game its own seed; the checkpoint carries the game's.
          seed: state.seed,
          packVersion: ctx.meta.packVersion,
          engineVersion: ctx.meta.engineVersion,
        });
        break;
      }
      case "tower-command": {
        if (ctx.replaying) break;
        // The screens ("Calling the tower back...") show while the tower answers, not after.
        ctx.onViewRefresh();
        let result: "ok" | "failed" = "failed";
        try {
          result = await ctx.tower.runCapability(effect.capabilityId, effect.params, ctx.log);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.log.error(
            "tower-command-failed",
            message.trim() === "" ? `Tower command ${effect.capabilityId} failed.` : message,
          );
          result = "failed";
        }
        outcomes.push({ capabilityId: effect.capabilityId, result });
        break;
      }
      default:
        break;
    }
  }
  return outcomes;
};

export const newGameId = () => `game-${randomBytes(6).toString("hex")}`;
