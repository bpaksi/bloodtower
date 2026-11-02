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

/**
 * Without the tower the app draws where the skull lands (DEC-305): a seeded draw among the
 * standing buildings of the seeded kingdom, from the play stream (`eventRng(seed, seq)`), so a
 * replay of the log lands on the same buildings. When that kingdom has none standing, any
 * standing building can take it. Returns the building's space id, or null when no skull could
 * be placed (none standing, or the supply is empty).
 */
export const simulateSkullDrop = (seed: string, kingdom: KingdomId): string | null => {
  const play = playState();
  const standing = play.content.board.spaces.filter(
    (space) => space.building && !isFallen(play, space.id),
  );
  const inKingdom = standing.filter((space) => space.kingdom === kingdom);
  const pool = inKingdom.length > 0 ? inKingdom : standing;
  if (pool.length === 0) return null;
  const space = nextPlayRng(seed, play).pick(pool);
  if (!recordBuildingDrop(play, space.id, space.kingdom)) return null;
  play.lastSkull = {
    kingdom: space.kingdom,
    spaceId: space.id,
    building: space.building ?? null,
  };
  return space.id;
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
