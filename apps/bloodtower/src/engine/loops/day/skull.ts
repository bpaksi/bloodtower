import type { KingdomId } from "../chapter/board.ts";
import { nextPlayRng, playState } from "../chapter/playState.ts";
import { recordOffer } from "../session/shellRef.ts";
import { ensureClock, isFallen, recordBuildingDrop, recordHeldSkull } from "./clock.ts";

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
  for (const space of play.content.board.spaces) {
    if (!space.building || isFallen(play, space.id)) continue;
    offerBuilding(day, space.id, ctx);
  }
  const insideId = skullRecordPromptId(day, SKULL_STAYED_INSIDE_TARGET);
  ctx.offerPrompt(insideId, "record");
  recordOffer(insideId, "record");
};

export type SimulatedDrop =
  | { landed: true; spaceId: string }
  | { landed: false; reason: "no-building" | "supply" };

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
