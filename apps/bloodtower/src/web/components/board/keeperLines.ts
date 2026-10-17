import { displayCaption } from "../../lib/caption.ts";

/** README F-10 Keeper lines. Line ids live in the avatar manifest, not the pack schema. */
export const KEEPER_MOMENT_ID = "grey-stair.03";

export const KEEPER_BASE_URL = "/avatars/keeper/";

export const KEEPER_LINE_IDS = ["ts-keeper-001", "ts-keeper-002", "ts-keeper-003"] as const;

export type KeeperLineId = (typeof KEEPER_LINE_IDS)[number];

export const KEEPER_LINE_TEXT: Record<KeeperLineId, string> = {
  "ts-keeper-001": "Light them if you can. [pause 0.5] The key is at the bottom. It always is.",
  "ts-keeper-002": "Mind the third step. It remembers everyone who ever fell on it.",
  "ts-keeper-003": "Go on, then. I'll keep the lamp lit until you're back. I always do.",
};

export const keeperCaption = (id: KeeperLineId): string => displayCaption(KEEPER_LINE_TEXT[id]);

export const nextKeeperLineIndex = (index: number): number | null => {
  const next = index + 1;
  return next < KEEPER_LINE_IDS.length ? next : null;
};
