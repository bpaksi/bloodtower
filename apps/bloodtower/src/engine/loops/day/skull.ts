import type { KingdomId } from "../chapter/board.ts";
import { nextPlayRng, type PlayState, playState } from "../chapter/playState.ts";
import { recordOffer } from "../session/shellRef.ts";
import {
  captureClock,
  ensureClock,
  isFallen,
  recordBuildingDrop,
  recordHeldSkull,
} from "./clock.ts";

/** Target id in skull-record prompts when the skull stayed inside the tower (DEC-064). */
export const SKULL_STAYED_INSIDE_TARGET = "inside";

export const skullRecordPromptId = (day: number, target: string): string =>
  `skull-record--${day}--${target}`;

export const parseSkullRecordPrompt = (
  promptId: string,
): { day: number; target: string } | null => {
  const parts = promptId.split("--");
  if (parts.length < 3 || parts[0] !== "skull-record") return null;
  const day = Number(parts[1]);
  if (!Number.isFinite(day) || day < 1) return null;
  return { day: Math.trunc(day), target: parts.slice(2).join("--") };
};

const offerBuilding = (
  day: number,
  spaceId: string,
  ctx: { offerPrompt: (promptId: string, actionId: string) => void },
): void => {
  const promptId = skullRecordPromptId(day, spaceId);
  ctx.offerPrompt(promptId, "record");
  recordOffer(promptId, "record");
};

export const offerSkullPlacement = (
  day: number,
  ctx: { offerPrompt: (promptId: string, actionId: string) => void },
): void => {
  const play = playState();
  // When the drop's kingdom is known, only that kingdom's standing buildings are offered (DEC-092);
  // a press on another is refused by `applySkullRecord` anyway.
  const expected = ensureClock(play).expectKingdom;
  for (const space of play.content.board.spaces) {
    if (!space.building || isFallen(play, space.id)) continue;
    if (expected && space.kingdom !== expected) continue;
    offerBuilding(day, space.id, ctx);
  }
  const insideId = skullRecordPromptId(day, SKULL_STAYED_INSIDE_TARGET);
  ctx.offerPrompt(insideId, "record");
  recordOffer(insideId, "record");
};

export type SimulatedDrop =
  | { landed: true; spaceId: string }
  | { landed: false; reason: "no-building" | "supply" | "lost" };

/**
 * Without the tower the app draws where the skull lands (DEC-305, PT-07): the kingdom by the die
 * (`drawKingdom`, one draw from the play stream), then the standing building in it with the
 * fewest skulls, read now, so each skull of a night sees the one before. Ties go to a seeded pick
 * from the play stream (`eventRng(seed, seq)`), so a replay of the log lands the same. When the
 * kingdom has nothing standing the kingdom is drawn once more; if that one is empty too, no skull
 * drops ("no-building") and the caller logs the error. No other building takes it.
 */
export const simulateSkullDrop = (seed: string, drawKingdom: () => KingdomId): SimulatedDrop => {
  const play = playState();
  const clock = ensureClock(play);
  // DEC-676, DEC-905: once the game is lost no later skull is drawn, so no draw is spent on it.
  if (clock.outcome?.lost === true) return { landed: false, reason: "lost" };
  if (clock.supply <= 0) return { landed: false, reason: "supply" };
  const standingIn = (kingdom: KingdomId) =>
    play.content.board.spaces.filter(
      (space) => space.building && space.kingdom === kingdom && !isFallen(play, space.id),
    );
  let pool = standingIn(drawKingdom());
  if (pool.length === 0) pool = standingIn(drawKingdom());
  if (pool.length === 0) return { landed: false, reason: "no-building" };
  const fewest = Math.min(...pool.map((space) => clock.skulls[space.id] ?? 0));
  const tied = pool.filter((space) => (clock.skulls[space.id] ?? 0) === fewest);
  const space =
    tied.length === 1 ? (tied[0] as (typeof tied)[number]) : nextPlayRng(seed, play).pick(tied);
  if (!recordBuildingDrop(play, space.id, space.kingdom))
    return { landed: false, reason: "supply" };
  play.lastSkull = {
    kingdom: space.kingdom,
    spaceId: space.id,
    building: space.building ?? null,
  };
  return { landed: true, spaceId: space.id };
};

export const applySkullRecord = (day: number, target: string): boolean => {
  const play = playState();
  if (play.dayNumber !== day) return false;
  const clock = ensureClock(play);
  // A skull recorded after the loss is refused: nothing changes (DEC-905).
  if (clock.outcome?.lost === true) return false;

  if (target === SKULL_STAYED_INSIDE_TARGET) {
    if (!recordHeldSkull(play)) return false;
    play.lastSkull = {
      kingdom: "N",
      spaceId: SKULL_STAYED_INSIDE_TARGET,
      building: "inside",
    };
    return true;
  }

  const space = play.content.board.spaceById.get(target);
  if (!space) return false;
  if (clock.expectKingdom && space.kingdom !== clock.expectKingdom) return false;
  if (space.building) {
    if (!recordBuildingDrop(play, space.id, space.kingdom)) return false;
  }
  play.lastSkull = {
    kingdom: space.kingdom,
    spaceId: space.id,
    building: space.building ?? null,
  };
  return true;
};

export type SkullRecord = {
  kingdom: KingdomId;
  spaceId: string;
  building: string | null;
};

/**
 * Count of skulls recorded as "inside" and still trapped in the tower (DEC-717, C2-11).
 * Read-only: uses `captureClock` so it never creates or mutates the day clock.
 */
export const trappedSkullCount = (play: PlayState): number => {
  const clock = captureClock(play);
  if (!clock) return 0;
  return Math.max(0, clock.held);
};

/**
 * Buildings with saved skulls on them (DEC-710, C2-11). Read-only: never mutates the day clock.
 */
export const savedBuildingSkulls = (
  play: PlayState,
): { spaceId: string; name: string; kingdom: KingdomId; skulls: number; fallen: boolean }[] => {
  const clock = captureClock(play);
  if (!clock) return [];
  const rows: {
    spaceId: string;
    name: string;
    kingdom: KingdomId;
    skulls: number;
    fallen: boolean;
  }[] = [];
  for (const space of play.content.board.spaces) {
    if (!space.building) continue;
    const count = clock.skulls[space.id] ?? 0;
    if (count > 0) {
      rows.push({
        spaceId: space.id,
        name: space.name,
        kingdom: space.kingdom,
        skulls: count,
        fallen: count >= 4,
      });
    }
  }
  return rows;
};
