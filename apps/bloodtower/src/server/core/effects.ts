import { randomBytes } from "node:crypto";
import type { ShellEffect } from "../../engine/loops/session/effects.ts";
import type { ShellState } from "../../engine/loops/session/state.ts";
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

export const runShellEffects = async (
  state: ShellState,
  effects: readonly ShellEffect[],
  ctx: EffectsContext,
): Promise<void> => {
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
      case "game-record":
        break;
      case "checkpoint-write": {
        const afterSeq = ctx.store.nextSeq(effect.gameId) - 1;
        ctx.store.writeCheckpoint({
          gameId: effect.gameId,
          day: effect.day,
          afterEventSeq: Math.max(0, afterSeq),
          stateJson: JSON.stringify(shellCheckpointFromState(state)),
          atMonoMs: ctx.clock.monoMs(),
          atWall: ctx.clock.wall(),
          seed: ctx.meta.seed,
          packVersion: ctx.meta.packVersion,
          engineVersion: ctx.meta.engineVersion,
        });
        break;
      }
      case "tower-command":
        if (ctx.replaying) break;
        await ctx.tower.runCapability(effect.capabilityId, effect.params, ctx.log);
        break;
      default:
        break;
    }
  }
};

export const newGameId = () => `game-${randomBytes(6).toString("hex")}`;
