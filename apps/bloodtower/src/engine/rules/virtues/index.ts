import type { PlayState } from "../../loops/chapter/playState.ts";
import { ensureClock, heroSheet, isFallen, setHeroSheet } from "../../loops/day/clock.ts";

/*
 * Turn-start virtues (CU/14, UI-037, DEC-408, DEC-934). A virtue is data: a name, the line it shows
 * on the Story board and, for one that asks, a list of options and what a pick does. The choice
 * list is generic: the board and the iPad read `options`, never a virtue's id. Infused (DEC-406) is
 * the only choice-asking virtue of the 1.0 deck, and `fixture` proves the list with three plain
 * options. Nothing here reads the table, the tower or a screen.
 */

/** The panel's title (Loremaster, step 45, `virtue.title`). */
export const VIRTUE_TITLE = "Virtues today";

/** One option of a virtue's choice. A disabled option is shown and cannot be pressed (DEC-934). */
export type VirtueOption = { id: string; label: string; enabled: boolean };

export type VirtueContext = {
  play: PlayState;
  groupId: string;
  /** The option already picked this turn, or null. */
  picked: string | null;
};

export type VirtueDef = {
  id: string;
  name: string;
  /** The tile's own effect text for the line, or null when the virtue has nothing to show now. */
  effect: (ctx: VirtueContext) => string | null;
  /** The options a pick offers now, or null when the virtue asks nothing. */
  options?: (ctx: VirtueContext) => VirtueOption[] | null;
  /** Applies a pick. False means nothing changed (an unknown or disabled option). */
  apply?: (ctx: VirtueContext, optionId: string) => boolean;
};

const groupOf = (play: PlayState, groupId: string) => play.groups.find((g) => g.id === groupId);

/** Buildings still standing in the kingdom the group stands in, with their skull counts. */
const kingdomBuildings = (play: PlayState, groupId: string) => {
  const group = groupOf(play, groupId);
  const here = group ? play.content.board.spaceById.get(group.spaceId) : undefined;
  if (!here) return { label: null as string | null, rows: [] as VirtueOption[] };
  const clock = ensureClock(play);
  const label = play.content.board.kingdoms.find((k) => k.id === here.kingdom)?.name ?? null;
  const rows = play.content.board.spaces
    .filter(
      (space) => space.kingdom === here.kingdom && space.building && !isFallen(play, space.id),
    )
    .map((space) => {
      const skulls = clock.skulls[space.id] ?? 0;
      return {
        id: space.id,
        label: `${space.name}, ${skulls} ${skulls === 1 ? "skull" : "skulls"}`,
        enabled: skulls > 0,
      };
    });
  return { label, rows };
};

const infused: VirtueDef = {
  id: "infused",
  name: "Infused",
  effect: (ctx) => {
    const { label, rows } = kingdomBuildings(ctx.play, ctx.groupId);
    // A pick already made keeps its line, though its skull is gone. No skull to take: no line.
    if (ctx.picked === null && !rows.some((row) => row.enabled)) return null;
    return `remove 1 skull in ${label ?? "the kingdom"}`;
  },
  options: (ctx) => {
    if (ctx.picked !== null) return null;
    const { rows } = kingdomBuildings(ctx.play, ctx.groupId);
    return rows.some((row) => row.enabled) ? rows : null;
  },
  apply: (ctx, optionId) => {
    const { rows } = kingdomBuildings(ctx.play, ctx.groupId);
    if (!rows.some((row) => row.id === optionId && row.enabled)) return false;
    const clock = ensureClock(ctx.play);
    clock.skulls[optionId] = (clock.skulls[optionId] ?? 0) - 1;
    // The skull goes back to the supply the night draws from.
    clock.supply = Math.min(clock.tuning.supply, clock.supply + 1);
    return true;
  },
};

const fortunate: VirtueDef = {
  id: "fortunate",
  name: "Fortunate",
  effect: () => "a second pick today",
};

/** TEST ONLY: asks a choice of three plain options, so the generic list is proved with no Infused. */
const FIXTURE_OPTIONS: VirtueOption[] = [
  { id: "one", label: "First", enabled: true },
  { id: "two", label: "Second", enabled: true },
  { id: "three", label: "Third", enabled: true },
];

const fixture: VirtueDef = {
  id: "fixture",
  name: "Fixture",
  effect: (ctx) => (ctx.picked === null ? "choose one of three" : "chose one of three"),
  options: (ctx) => (ctx.picked === null ? FIXTURE_OPTIONS.map((o) => ({ ...o })) : null),
  apply: (_ctx, optionId) => FIXTURE_OPTIONS.some((o) => o.id === optionId),
};

export const VIRTUES: ReadonlyMap<string, VirtueDef> = new Map(
  [infused, fortunate, fixture].map((def) => [def.id, def]),
);

/** The virtue ids a hero holds. Absent: none. */
export const heroVirtues = (play: PlayState, heroId: string): string[] => [
  ...(heroSheet(ensureClock(play), heroId).virtues ?? []),
];

export const giveVirtue = (play: PlayState, heroId: string, virtueId: string): void => {
  const clock = ensureClock(play);
  const sheet = heroSheet(clock, heroId);
  const held = sheet.virtues ?? [];
  if (held.includes(virtueId)) return;
  setHeroSheet(play, heroId, { ...sheet, virtues: [...held, virtueId] });
};

/** The virtues a group holds, once each, in the order its heroes gained them. */
export const groupVirtueIds = (play: PlayState, groupId: string): string[] => {
  const group = groupOf(play, groupId);
  if (!group) return [];
  const seen = new Set<string>();
  for (const heroId of group.heroIds) {
    for (const id of heroVirtues(play, heroId)) seen.add(id);
  }
  return [...seen];
};

export type VirtuePanel = {
  title: string;
  lines: { id: string; text: string }[];
  /** The one pending choice (the first virtue that asks), or null. */
  choice: { virtueId: string; options: VirtueOption[] } | null;
};

/** `picks` maps a virtue id to the option picked this turn. A held id with no tile is skipped. */
export const virtuePanel = (
  play: PlayState,
  groupId: string,
  picks: Readonly<Record<string, string>>,
): VirtuePanel => {
  const lines: VirtuePanel["lines"] = [];
  let choice: VirtuePanel["choice"] = null;
  for (const id of groupVirtueIds(play, groupId)) {
    const def = VIRTUES.get(id);
    if (!def) continue;
    const ctx = { play, groupId, picked: picks[id] ?? null };
    const effect = def.effect(ctx);
    if (effect === null) continue;
    lines.push({ id, text: `${def.name}: ${effect}` });
    const options = def.options?.(ctx) ?? null;
    if (!choice && options && options.length > 0) choice = { virtueId: id, options };
  }
  return { title: VIRTUE_TITLE, lines, choice };
};

/** True when the group has any virtue line to show at its turn start. */
export const hasVirtuePanel = (play: PlayState, groupId: string): boolean =>
  virtuePanel(play, groupId, {}).lines.length > 0;

export const virtueName = (virtueId: string): string => VIRTUES.get(virtueId)?.name ?? virtueId;

/**
 * Applies a pick and returns the label the board mirrors, or null when nothing changed (a virtue
 * the group does not hold, an unknown or disabled option, a virtue that asks nothing).
 */
export const applyVirtueChoice = (
  play: PlayState,
  groupId: string,
  virtueId: string,
  optionId: string,
): string | null => {
  const def = VIRTUES.get(virtueId);
  if (!def?.apply || !groupVirtueIds(play, groupId).includes(virtueId)) return null;
  const ctx = { play, groupId, picked: null };
  const option = def.options?.(ctx)?.find((row) => row.id === optionId);
  if (!option?.enabled) return null;
  return def.apply(ctx, optionId) ? option.label : null;
};
