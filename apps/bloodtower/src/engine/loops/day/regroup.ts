import { groupById, type PlayState, playState } from "../chapter/playState.ts";
import { recordOffer } from "../session/shellRef.ts";

export type RegroupOffer = { promptId: string; actionId: string };

const refreshTurnOrder = (play: PlayState): void => {
  play.turnOrder = [...play.groups]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((group) => group.id);
};

/** A split-off group is newest and plays last (DEC-640, DEC-148). */
export const applySplit = (play: PlayState, groupId: string, heroId: string): string | null => {
  const group = groupById(play, groupId);
  if (!group || group.heroIds.length < 2 || !group.heroIds.includes(heroId)) return null;
  group.heroIds = group.heroIds.filter((id) => id !== heroId);
  const order = play.groups.reduce((max, row) => Math.max(max, row.order), 0) + 1;
  const id = `split-${heroId}-${order}`;
  play.groups.push({
    id,
    heroIds: [heroId],
    spaceId: group.spaceId,
    insideBuilding: false,
    order,
  });
  refreshTurnOrder(play);
  return id;
};

/** The merged group keeps the older group's place (DEC-148). */
export const applyJoin = (play: PlayState, aId: string, bId: string): boolean => {
  const a = groupById(play, aId);
  const b = groupById(play, bId);
  if (!a || !b || a.id === b.id || a.spaceId !== b.spaceId) return false;
  const older = a.order <= b.order ? a : b;
  const newer = older === a ? b : a;
  older.heroIds = [...older.heroIds, ...newer.heroIds];
  play.groups = play.groups.filter((group) => group.id !== newer.id);
  refreshTurnOrder(play);
  return true;
};

export const regroupOffers = (play: PlayState): RegroupOffer[] => {
  const offers: RegroupOffer[] = [];
  for (const group of play.groups) {
    if (group.heroIds.length < 2) continue;
    for (const heroId of group.heroIds) {
      offers.push({ promptId: `regroup-split--${group.id}--${heroId}`, actionId: "split" });
    }
  }
  const bySpace = new Map<string, typeof play.groups>();
  for (const group of play.groups) {
    const list = bySpace.get(group.spaceId) ?? [];
    list.push(group);
    bySpace.set(group.spaceId, list);
  }
  for (const groups of bySpace.values()) {
    if (groups.length < 2) continue;
    const ordered = [...groups].sort((a, b) => a.order - b.order);
    const oldest = ordered[0];
    if (!oldest) continue;
    for (const other of ordered.slice(1)) {
      offers.push({
        promptId: `regroup-join--${oldest.id}--${other.id}`,
        actionId: "join",
      });
    }
  }
  offers.push({ promptId: "regroup-done", actionId: "done" });
  return offers;
};

/** Skipped when every hero already stands alone on their own space (DEC-640). */
export const regroupNeeded = (play: PlayState): boolean =>
  regroupOffers(play).some((offer) => offer.actionId !== "done");

export const parseSplitPrompt = (promptId: string): { groupId: string; heroId: string } | null => {
  const parts = promptId.split("--");
  if (parts[0] !== "regroup-split" || parts.length < 3) return null;
  const groupId = parts[1];
  if (!groupId) return null;
  return { groupId, heroId: parts.slice(2).join("--") };
};

export const parseJoinPrompt = (promptId: string): { aId: string; bId: string } | null => {
  const parts = promptId.split("--");
  if (parts.length !== 3 || parts[0] !== "regroup-join") return null;
  const aId = parts[1];
  const bId = parts[2];
  if (!aId || !bId) return null;
  return { aId, bId };
};

export const offerRegroup = (ctx: {
  offerPrompt: (promptId: string, actionId: string) => void;
}): void => {
  for (const offer of regroupOffers(playState())) {
    ctx.offerPrompt(offer.promptId, offer.actionId);
    recordOffer(offer.promptId, offer.actionId);
  }
};
