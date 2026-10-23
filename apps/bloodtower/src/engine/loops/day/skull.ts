import type { KingdomId } from "../chapter/board.ts";
import { playState } from "../chapter/playState.ts";
import { recordOffer } from "../session/shellRef.ts";

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

export const offerSkullPlacement = (
  day: number,
  ctx: { offerPrompt: (promptId: string, actionId: string) => void },
): void => {
  const board = playState().content.board;
  for (const space of board.spaces) {
    if (!space.building) continue;
    const promptId = skullRecordPromptId(day, space.id);
    ctx.offerPrompt(promptId, "record");
    recordOffer(promptId, "record");
  }
  const insideId = skullRecordPromptId(day, SKULL_STAYED_INSIDE_TARGET);
  ctx.offerPrompt(insideId, "record");
  recordOffer(insideId, "record");
};

export const applySkullRecord = (day: number, target: string): boolean => {
  const play = playState();
  if (play.dayNumber !== day) return false;

  if (target === SKULL_STAYED_INSIDE_TARGET) {
    play.lastSkull = {
      kingdom: "N",
      spaceId: SKULL_STAYED_INSIDE_TARGET,
      building: "inside",
    };
    return true;
  }

  const space = play.content.board.spaceById.get(target);
  if (!space) return false;
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
