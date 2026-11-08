import { groupById, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, markQuestWon } from "../day/clock.ts";
import { ensurePicks } from "../encounter/picks.ts";
import { type PlainScene, type SceneOption, visibleOptions } from "../scene/scene.ts";
import { ensureQuests, type QuestDef, type QuestStore } from "./store.ts";

/*
 * The board waits during a quest (DEC-084): nothing here touches the day clock except the
 * won-quest mark at the end (DEC-699).
 */

export type QuestRefusal =
  | "unknown-group"
  | "unknown-quest"
  | "already-done"
  | "not-offered"
  | "disabled"
  | "not-chosen"
  | "nothing-to-pick"
  | "not-pickable";

export type OptionView = { id: string; label: string; disabled: boolean };

export type Pending = { kind: "corruption" | "item"; heroes: string[] };

export type QuestView = {
  questId: string;
  options: OptionView[];
  /** A hero the group must pick before the quest goes on. */
  pending: Pending | null;
  done: boolean;
};

export type QuestResult = { ok: true; view: QuestView } | { ok: false; reason: QuestRefusal };

const defOf = (store: QuestStore, questId: string): QuestDef | undefined =>
  store.defs.find((d) => d.id === questId);

const presentHeroes = (play: PlayState, groupId: string): string[] =>
  groupById(play, groupId)?.heroIds ?? [];

const optionOf = (scene: PlainScene, optionId: string | null): SceneOption | undefined =>
  scene.options.find((o) => o.id === optionId);

const holdsItem = (store: QuestStore, heroes: string[], item: string): boolean =>
  heroes.some((hero) => store.items[hero]?.includes(item));

/** Gold an option asks for before it can run (not the toll: a short purse still pays it). */
const goldNeeded = (option: SceneOption): number => {
  const cost = option.cost?.kind === "gold" ? option.cost.amount : 0;
  const spend = option.effects.reduce(
    (sum, e) => (e.kind === "gold" && e.amount < 0 ? sum - e.amount : sum),
    0,
  );
  return cost + spend;
};

const isDisabled = (
  play: PlayState,
  store: QuestStore,
  groupId: string,
  option: SceneOption,
): boolean => {
  if (option.needsItem && !holdsItem(store, presentHeroes(play, groupId), option.needsItem)) {
    return true;
  }
  return goldNeeded(option) > (ensurePicks(play).purse[groupId] ?? 0);
};

const pendingOf = (store: QuestStore, def: QuestDef, heroes: string[]): Pending | null => {
  const progress = store.progress[def.id];
  const option = optionOf(def.scene, progress?.optionId ?? null);
  if (!progress || !option) return null;
  if (!progress.costPaid) return { kind: "corruption", heroes };
  const effect = option.effects[progress.next];
  if (effect?.kind === "item") return { kind: "item", heroes };
  return null;
};

const viewOf = (play: PlayState, groupId: string, def: QuestDef): QuestView => {
  const store = ensureQuests(play);
  return {
    questId: def.id,
    options: visibleOptions(def.scene).map((o) => ({
      id: o.id,
      label: o.label,
      disabled: isDisabled(play, store, groupId, o),
    })),
    pending: pendingOf(store, def, presentHeroes(play, groupId)),
    done: store.done.includes(def.id),
  };
};

const finish = (play: PlayState, groupId: string, def: QuestDef): void => {
  const store = ensureQuests(play);
  const picks = ensurePicks(play);
  const heroes = presentHeroes(play, groupId);
  // DEC-700: quest gold to each present hero.
  picks.purse[groupId] = (picks.purse[groupId] ?? 0) + store.tuning.questGold * heroes.length;
  store.done.push(def.id);
  delete store.progress[def.id];
  markQuestWon(play);
};

/** Applies effects in order until one needs a pick or the list ends; then the quest is done. */
const runEffects = (play: PlayState, groupId: string, def: QuestDef): void => {
  const store = ensureQuests(play);
  const progress = store.progress[def.id];
  const option = optionOf(def.scene, progress?.optionId ?? null);
  if (!progress || !option) return;
  const picks = ensurePicks(play);
  while (progress.next < option.effects.length) {
    const effect = option.effects[progress.next];
    if (!effect || effect.kind === "item") return;
    if (effect.kind === "gold") {
      picks.purse[groupId] = Math.max(0, (picks.purse[groupId] ?? 0) + effect.amount);
      store.log.push(`gold:${effect.amount}`);
    } else {
      if (!store.flags.includes(effect.flag)) store.flags.push(effect.flag);
      store.log.push(`flag:${effect.flag}`);
    }
    progress.next += 1;
  }
  finish(play, groupId, def);
};

const payCost = (play: PlayState, groupId: string, option: SceneOption): boolean => {
  const store = ensureQuests(play);
  const picks = ensurePicks(play);
  const heroes = presentHeroes(play, groupId);
  const cost = option.cost;
  if (!cost) return true;
  const cutHitPoints = (amount: number): void => {
    for (const hero of heroes) {
      const hp = picks.hp[hero];
      // DEC-714: stop at 1. An unknown hit-point total is left alone, never read as zero.
      if (hp) hp.hp = Math.max(Math.min(hp.hp, 1), hp.hp - amount);
    }
  };
  if (cost.kind === "gold") {
    picks.purse[groupId] = (picks.purse[groupId] ?? 0) - cost.amount;
    store.log.push(`cost-gold:${cost.amount}`);
  } else if (cost.kind === "hp") {
    cutHitPoints(cost.amount);
    store.log.push(`cost-hp:${cost.amount}`);
  } else if (cost.kind === "toll") {
    const purse = picks.purse[groupId] ?? 0;
    const toll = store.tuning.tollGold;
    if (purse >= toll) {
      picks.purse[groupId] = purse - toll;
    } else {
      picks.purse[groupId] = 0;
      cutHitPoints(store.tuning.tollHitPoints);
    }
    store.log.push("cost-toll");
  } else {
    return false;
  }
  return true;
};

/** Enter the quest at the group's space or by id. Progress from an earlier visit resumes. */
export const beginQuest = (play: PlayState, groupId: string, questId: string): QuestResult => {
  if (!groupById(play, groupId)) return { ok: false, reason: "unknown-group" };
  const store = ensureQuests(play);
  const def = defOf(store, questId);
  if (!def) return { ok: false, reason: "unknown-quest" };
  if (store.done.includes(questId)) return { ok: false, reason: "already-done" };
  store.progress[questId] ??= { optionId: null, costPaid: false, next: 0 };
  return { ok: true, view: viewOf(play, groupId, def) };
};

/** The group takes an option. A corruption cost or an item then waits for a hero pick. */
export const chooseOption = (
  play: PlayState,
  groupId: string,
  questId: string,
  optionId: string,
): QuestResult => {
  if (!groupById(play, groupId)) return { ok: false, reason: "unknown-group" };
  const store = ensureQuests(play);
  const def = defOf(store, questId);
  const progress = store.progress[questId];
  if (!def || !progress) return { ok: false, reason: "unknown-quest" };
  const option = visibleOptions(def.scene).find((o) => o.id === optionId);
  if (!option) return { ok: false, reason: "not-offered" };
  if (progress.optionId) return { ok: false, reason: "not-offered" };
  if (isDisabled(play, store, groupId, option)) return { ok: false, reason: "disabled" };
  progress.optionId = option.id;
  progress.costPaid = payCost(play, groupId, option);
  if (progress.costPaid) runEffects(play, groupId, def);
  return { ok: true, view: viewOf(play, groupId, def) };
};

/** The hero the group picked takes the corruption (DEC-693) or the item (DEC-653). */
export const pickHero = (
  play: PlayState,
  groupId: string,
  questId: string,
  heroId: string,
): QuestResult => {
  if (!groupById(play, groupId)) return { ok: false, reason: "unknown-group" };
  const store = ensureQuests(play);
  const def = defOf(store, questId);
  const progress = store.progress[questId];
  if (!def || !progress) return { ok: false, reason: "unknown-quest" };
  const option = optionOf(def.scene, progress.optionId);
  if (!option) return { ok: false, reason: "not-chosen" };
  const pending = pendingOf(store, def, presentHeroes(play, groupId));
  if (!pending) return { ok: false, reason: "nothing-to-pick" };
  if (!pending.heroes.includes(heroId)) return { ok: false, reason: "not-pickable" };
  if (pending.kind === "corruption") {
    const clock = ensureClock(play);
    const sheet = heroSheet(clock, heroId);
    clock.heroes[heroId] = { ...sheet, corruptions: sheet.corruptions + 1 };
    progress.costPaid = true;
    store.log.push(`cost-corruption:${heroId}`);
  } else {
    const effect = option.effects[progress.next];
    if (effect?.kind !== "item") return { ok: false, reason: "nothing-to-pick" };
    store.items[heroId] = [...(store.items[heroId] ?? []), effect.item];
    store.log.push(`item:${effect.item}:${heroId}`);
    progress.next += 1;
  }
  runEffects(play, groupId, def);
  return { ok: true, view: viewOf(play, groupId, def) };
};

/** Leave mid-quest: progress stays where it is. The board never moved (DEC-084). */
export const leaveQuest = (play: PlayState, questId: string): boolean =>
  Boolean(ensureQuests(play).progress[questId]);

/** The quest marker at a space, if it is still open. */
export const openQuestAt = (play: PlayState, spaceId: string): string | null => {
  const store = ensureQuests(play);
  const id = store.bySpace[spaceId];
  return id && !store.done.includes(id) ? id : null;
};
