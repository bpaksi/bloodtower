import type { GroupState, PlayState, QueuedRegroup, RegroupKind } from "../chapter/playState.ts";
import { REGROUP_DROPPED } from "../session/effects.ts";

const refreshTurnOrder = (play: Pick<PlayState, "groups" | "turnOrder">): void => {
  play.turnOrder = [...play.groups]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((group) => group.id);
};

type Groups = Pick<PlayState, "groups" | "turnOrder">;

/** A split-off group is newest and plays last (DEC-640, DEC-148). */
export const applySplit = (play: Groups, groupId: string, heroId: string): string | null => {
  const group = play.groups.find((row) => row.id === groupId);
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
export const applyJoin = (play: Groups, aId: string, bId: string): boolean => {
  const a = play.groups.find((row) => row.id === aId);
  const b = play.groups.find((row) => row.id === bId);
  if (!a || !b || a.id === b.id || a.spaceId !== b.spaceId) return false;
  const older = a.order <= b.order ? a : b;
  const newer = older === a ? b : a;
  older.heroIds = [...older.heroIds, ...newer.heroIds];
  play.groups = play.groups.filter((group) => group.id !== newer.id);
  refreshTurnOrder(play);
  return true;
};

const groupOf = (play: Groups, heroId: string): GroupState | undefined =>
  play.groups.find((group) => group.heroIds.includes(heroId));

/** The oldest other group on the same space: the one a Rejoin merges with (DEC-148). */
const rejoinTarget = (play: Groups, group: GroupState): GroupState | undefined =>
  play.groups
    .filter((row) => row.id !== group.id && row.spaceId === group.spaceId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))[0];

/** Why a queued action cannot apply now, or null when it can. */
const blocked = (play: Groups, entry: Pick<QueuedRegroup, "kind" | "heroId">): string | null => {
  const group = groupOf(play, entry.heroId);
  if (!group) return "the hero is no longer in play";
  if (entry.kind === "split") {
    return group.heroIds.length < 2 ? "the hero is no longer in a group of 2 or more" : null;
  }
  return rejoinTarget(play, group) ? null : "no other group shares the hero's space";
};

/** Applies one queued action. False when it cannot apply; the groups are then untouched. */
const applyOne = (play: Groups, entry: Pick<QueuedRegroup, "kind" | "heroId">): boolean => {
  if (blocked(play, entry)) return false;
  const group = groupOf(play, entry.heroId);
  if (!group) return false;
  if (entry.kind === "split") return applySplit(play, group.id, entry.heroId) !== null;
  const target = rejoinTarget(play, group);
  return target ? applyJoin(play, group.id, target.id) : false;
};

export const regroupQueue = (play: PlayState): QueuedRegroup[] => play.regroupQueue ?? [];

/** The groups as they will be at the next day start, once the queue has applied (Q4.2). */
export const projectedGroups = (play: PlayState): Groups => {
  const scratch: Groups = {
    groups: structuredClone(play.groups),
    turnOrder: [...play.turnOrder],
  };
  for (const entry of regroupQueue(play)) applyOne(scratch, entry);
  return scratch;
};

export type RegroupPick = { kind: RegroupKind; heroId: string };

/**
 * What the gear's Split party panel offers, read against the groups after the queue (Q4.3):
 * Split for each hero in a group of 2 or more, Rejoin for each hero whose group shares its
 * space with another. An opposite pick for a hero with a queued action cancels that action.
 */
export const regroupPicks = (play: PlayState): RegroupPick[] => {
  const after = projectedGroups(play);
  const picks: RegroupPick[] = [];
  for (const group of [...after.groups].sort((a, b) => a.order - b.order)) {
    if (group.heroIds.length >= 2) {
      for (const heroId of group.heroIds) picks.push({ kind: "split", heroId });
    }
  }
  for (const group of [...after.groups].sort((a, b) => a.order - b.order)) {
    if (!rejoinTarget(after, group)) continue;
    for (const heroId of group.heroIds) picks.push({ kind: "join", heroId });
  }
  return picks;
};

/** True while two groups share a space, so the gear row reads "Rejoin party" (C2 feature 04). */
export const partyIsSplit = (play: PlayState): boolean =>
  play.groups.some((group) => rejoinTarget(play, group) !== undefined);

const opposite = (kind: RegroupKind): RegroupKind => (kind === "split" ? "join" : "split");

/**
 * One gear pick (Q4.2): an opposite pick for a hero with a queued action removes it; any other
 * offered pick is added at the end. Nothing changes groups now; the next day start applies it.
 * Returns false for a pick that is not on offer (a stale view), which changes nothing.
 */
export const queueRegroupPick = (
  play: PlayState,
  kind: RegroupKind,
  heroId: string,
  deviceId: string | null,
): boolean => {
  const queue = regroupQueue(play);
  const cancels = queue.findIndex(
    (entry) => entry.heroId === heroId && entry.kind === opposite(kind),
  );
  if (cancels >= 0) {
    play.regroupQueue = queue.filter((_, index) => index !== cancels);
    return true;
  }
  if (!regroupPicks(play).some((pick) => pick.kind === kind && pick.heroId === heroId)) {
    return false;
  }
  play.regroupQueue = [...queue, { kind, heroId, deviceId }];
  return true;
};

export type RegroupDropped = {
  kind: "press-error";
  v: 1;
  code: typeof REGROUP_DROPPED;
  message: string;
  deviceId?: string;
};

/**
 * The day start (DEC-640, PT-18): applies the queue in pick order and clears it. An action that
 * cannot apply is dropped and reported with its own code to the iPad that queued it (Q4.2).
 * Returns how many actions applied.
 */
export const applyRegroupQueue = (
  play: PlayState,
  heroName: (heroId: string) => string,
  report: (error: RegroupDropped) => void,
): number => {
  const queue = regroupQueue(play);
  play.regroupQueue = [];
  let applied = 0;
  for (const entry of queue) {
    const why = blocked(play, entry);
    if (why === null && applyOne(play, entry)) {
      applied += 1;
      continue;
    }
    const action = entry.kind === "split" ? "Split" : "Rejoin";
    report({
      kind: "press-error",
      v: 1,
      code: REGROUP_DROPPED,
      message: `Day ${play.dayNumber}: the queued ${action} for ${heroName(entry.heroId)} could not apply (${why ?? "the groups changed"}), so it was dropped.`,
      ...(entry.deviceId ? { deviceId: entry.deviceId } : {}),
    });
  }
  return applied;
};
