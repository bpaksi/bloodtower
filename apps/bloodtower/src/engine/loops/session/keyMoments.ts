import { itemName } from "../../rules/items/index.ts";
import { tryChapters } from "../chapter/chapters.ts";
import type { PlayState } from "../chapter/playState.ts";
import { captureClock } from "../day/clock.ts";
import { ensureQuests } from "../quest/store.ts";
import type { ShellEffect } from "./effects.ts";
import type { ShellState } from "./state.ts";

/*
 * Key moments (Q-C3-18; Gamewright 2026-11-23): the stats screen lists them from the event log,
 * one line each with its day and names (C3/17 mockup: "Day {N}: {quest} done.", "{hero} took a
 * corruption.", "{hero} gained {item}.", "{building} fell.", "Chapter won."). The loops that cause
 * them do not log them, so the session compares the play state before and after each step and
 * emits one `key-moment` effect per new moment; the host writes each as a log row.
 */

/** A building falls at its fourth skull (DEC-044, PT-02), as `isFallen` reads it. */
const FALLEN_AT = 4;

export type KeyMomentSnapshot = {
  /** The play object this was read from: a diff across two plays (Continue) is not a moment. */
  play: PlayState;
  questsDone: string[];
  /** Hero id → corruptions held and the named ones (MEC-080). */
  corruptions: Record<string, { count: number; named: string[] }>;
  /** Hero id → every item held: sheet items (CU/13) and story items (DEC-653). */
  items: Record<string, string[]>;
  fallen: string[];
  chaptersWon: number;
};

/** Reads what the moments are made of, or null before play has a day clock. Copies; never mutates. */
export const snapshotMoments = (state: ShellState): KeyMomentSnapshot | null => {
  const play = state.play;
  if (!play) return null;
  const clock = captureClock(play);
  if (!clock) return null;
  const quests = ensureQuests(play);
  const corruptions: KeyMomentSnapshot["corruptions"] = {};
  const items: KeyMomentSnapshot["items"] = {};
  for (const heroId of play.groups.flatMap((group) => group.heroIds)) {
    const sheet = clock.heroes[heroId];
    corruptions[heroId] = { count: sheet?.corruptions ?? 0, named: [...(sheet?.named ?? [])] };
    items[heroId] = [...(sheet?.items ?? []), ...(quests.items[heroId] ?? [])];
  }
  return {
    play,
    questsDone: [...quests.done],
    corruptions,
    items,
    fallen: Object.entries(clock.skulls)
      .filter(([, count]) => count >= FALLEN_AT)
      .map(([spaceId]) => spaceId),
    chaptersWon: (tryChapters(play)?.nodes ?? []).filter((node) => node === "won").length,
  };
};

/** What is in `after` and not in `before`, counting repeats (two potions, one new: one). */
const added = (before: readonly string[], after: readonly string[]): string[] => {
  const left = [...before];
  return after.filter((entry) => {
    const at = left.indexOf(entry);
    if (at < 0) return true;
    left.splice(at, 1);
    return false;
  });
};

type KeyMomentEffect = Extract<ShellEffect, { kind: "key-moment" }>;

const heroNameOf = (state: ShellState, heroId: string): string => {
  for (const story of state.stories) {
    const hero = story.heroes.find((row) => row.id === heroId);
    if (hero) return hero.name;
  }
  return heroId;
};

/** A quest has no name of its own in the pack; the table knows it by its place (DEC-083). */
const questPlaceName = (play: PlayState, questId: string): string | null => {
  const quests = ensureQuests(play);
  const maps = [quests.bySpace, ...Object.values(quests.markersByChapter ?? {})];
  for (const map of maps) {
    const spaceId = Object.entries(map).find(([, id]) => id === questId)?.[0];
    if (spaceId) return play.content.board.spaceById.get(spaceId)?.name ?? null;
  }
  return null;
};

/**
 * The moments one step made, in the Q-C3-18 order within the step. Nothing when there is no game
 * id, no snapshot on either side, or the step swapped the play object (a Continue rebuilt it).
 */
export const momentsBetween = (
  state: ShellState,
  before: KeyMomentSnapshot | null,
  after: KeyMomentSnapshot | null,
): KeyMomentEffect[] => {
  const gameId = state.activeGameId;
  if (!gameId || !before || !after || before.play !== after.play) return [];
  const play = after.play;
  const day = play.dayNumber > 0 ? play.dayNumber : null;
  const base = { kind: "key-moment" as const, v: 1 as const, gameId, day };
  const out: KeyMomentEffect[] = [];
  for (const questId of added(before.questsDone, after.questsDone)) {
    const place = questPlaceName(play, questId);
    out.push({ ...base, moment: "quest-done", questId, quest: place ?? questId });
  }
  for (const [heroId, now] of Object.entries(after.items)) {
    for (const itemId of added(before.items[heroId] ?? [], now)) {
      out.push({
        ...base,
        moment: "item-gained",
        heroId,
        hero: heroNameOf(state, heroId),
        itemId,
        item: itemName(itemId) ?? itemId,
      });
    }
  }
  for (const spaceId of added(before.fallen, after.fallen)) {
    out.push({
      ...base,
      moment: "building-fallen",
      spaceId,
      building: play.content.board.spaceById.get(spaceId)?.name ?? spaceId,
    });
  }
  for (const [heroId, now] of Object.entries(after.corruptions)) {
    const was = before.corruptions[heroId] ?? { count: 0, named: [] };
    const named = added(was.named, now.named);
    for (let index = 0; index < now.count - was.count; index += 1) {
      const corruptionId = named[index];
      out.push({
        ...base,
        moment: "corruption-taken",
        heroId,
        hero: heroNameOf(state, heroId),
        ...(corruptionId ? { corruptionId } : {}),
      });
    }
  }
  for (let won = before.chaptersWon; won < after.chaptersWon; won += 1) {
    out.push({ ...base, moment: "chapter-won", chapter: won + 1 });
  }
  return out;
};
