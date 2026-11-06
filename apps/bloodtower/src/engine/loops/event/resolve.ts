import type { PlayState } from "../chapter/playState.ts";
import { groupById } from "../chapter/playState.ts";
import type { EventTuning } from "./rules.ts";
import {
  type EventOption,
  eventState,
  HAZARD_COUNTER,
  type HeroLedger,
  type OpenEvent,
  type OptionId,
} from "./state.ts";

const openEventOf = (play: PlayState): OpenEvent => {
  const open = eventState(play).open;
  if (open?.status !== "open") throw new Error("No event is open.");
  return open;
};

const presentHeroes = (play: PlayState, event: OpenEvent): [string, HeroLedger][] => {
  const group = groupById(play, event.groupId);
  if (!group) throw new Error(`Unknown group ${event.groupId}.`);
  const state = eventState(play);
  return group.heroIds.map((id) => {
    const ledger = state.heroes[id];
    if (!ledger) throw new Error(`Hit points and gold for ${id} are unknown.`);
    return [id, ledger];
  });
};

/** The group's pooled purse: the sum of the present heroes' shares (DEC-178). */
export const purseOf = (play: PlayState, groupId: string): number => {
  const group = groupById(play, groupId);
  if (!group) throw new Error(`Unknown group ${groupId}.`);
  const heroes = eventState(play).heroes;
  return group.heroIds.reduce((sum, id) => {
    const ledger = heroes[id];
    if (!ledger) throw new Error(`Hit points and gold for ${id} are unknown.`);
    return sum + ledger.gold;
  }, 0);
};

/** Equal parts; the first heroes take the remainder. */
const split = (amount: number, parts: number): number[] =>
  Array.from(
    { length: parts },
    (_, i) => Math.floor(amount / parts) + (i < amount % parts ? 1 : 0),
  );

const earn = (heroes: [string, HeroLedger][], amount: number): void => {
  split(amount, heroes.length).forEach((part, i) => {
    const hero = heroes[i];
    if (hero) hero[1].gold += part;
  });
};

/** A cost is paid equally; when one hero's part runs short the others cover the gap (DEC-178). */
const spend = (heroes: [string, HeroLedger][], amount: number): void => {
  const total = heroes.reduce((sum, [, h]) => sum + h.gold, 0);
  if (total < amount) throw new Error("The purse is short.");
  let left = amount;
  split(amount, heroes.length).forEach((part, i) => {
    const hero = heroes[i];
    if (!hero) return;
    const paid = Math.min(part, hero[1].gold);
    hero[1].gold -= paid;
    left -= paid;
  });
  for (const [, hero] of heroes) {
    if (left <= 0) break;
    const paid = Math.min(left, hero.gold);
    hero.gold -= paid;
    left -= paid;
  }
};

/** No event can lose the game by itself: hit points never drop below `minimum` here (MEC-013). */
const hurt = (heroes: [string, HeroLedger][], delta: number, minimum: number): void => {
  for (const [, hero] of heroes) {
    hero.hitPoints = Math.max(Math.min(hero.hitPoints, minimum), hero.hitPoints + delta);
  }
};

const counterHeld = (play: PlayState, event: OpenEvent): boolean => {
  if (!event.hazard) return false;
  const counter = HAZARD_COUNTER[event.hazard];
  return counter !== null && presentHeroes(play, event).some(([, h]) => h.role === counter);
};

/** The choices the present heroes see now. Empty when the event needs no choice. */
export const eventOptions = (play: PlayState, tuning: EventTuning): EventOption[] => {
  const event = openEventOf(play);
  if (event.type === "foes" || event.type === "disaster") {
    const purse = purseOf(play, event.groupId);
    const options: EventOption[] = [];
    // Fight stays hidden until C4 flips `fight_enabled` (Q-C3-02).
    if (tuning.fightEnabled) options.push({ id: "fight", enabled: true });
    options.push({ id: "go-around", enabled: true });
    options.push({ id: "pay-off", enabled: purse >= tuning.payOff });
    return options;
  }
  if (event.hazard && !counterHeld(play, event)) {
    return [
      { id: "hit-points", enabled: true },
      { id: "lose-turn", enabled: true },
    ];
  }
  return [];
};

const done = (event: OpenEvent, line: string): void => {
  event.log.push(line);
  event.status = "resolved";
};

/** Resolves an event that needs no choice: quiet, windfall, rumour, or a countered hazard. */
export const settleEvent = (play: PlayState, tuning: EventTuning): OpenEvent => {
  const event = openEventOf(play);
  if (eventOptions(play, tuning).length > 0) throw new Error("This event needs a choice.");
  if (event.type === "windfall") {
    earn(presentHeroes(play, event), tuning.windfallGold);
    done(event, `windfall ${tuning.windfallGold} gold`);
  } else if (event.hazard) {
    done(event, "cancelled by counter");
  } else {
    done(event, event.offer ?? "quiet");
  }
  return event;
};

/** The present heroes pick one option. A disabled or unoffered option is refused. */
export const chooseOption = (play: PlayState, tuning: EventTuning, id: OptionId): OpenEvent => {
  const event = openEventOf(play);
  const option = eventOptions(play, tuning).find((o) => o.id === id);
  if (!option) throw new Error(`The event does not offer ${id}.`);
  if (!option.enabled) throw new Error(`${id} is not available.`);
  const heroes = presentHeroes(play, event);
  switch (id) {
    case "hit-points":
      hurt(heroes, tuning.hazardHitPoints, 1);
      done(event, "hazard cost: hit points");
      break;
    case "lose-turn":
      eventState(play).lostTurns.push(event.groupId);
      done(event, "hazard cost: lost turn");
      break;
    case "go-around":
      hurt(heroes, tuning.goAroundHitPoints, tuning.goAroundMinimum);
      done(event, "went around");
      break;
    case "pay-off":
      spend(heroes, tuning.payOff);
      done(event, `paid ${tuning.payOff} gold`);
      break;
    case "fight":
      // The battle loop is C4's; the event waits for it.
      event.status = "battle";
      event.log.push("fight");
      break;
  }
  return event;
};

/** True when a present hero is down; an event alone must never cause it (MEC-013). */
export const groupLost = (play: PlayState, groupId: string): boolean => {
  const group = groupById(play, groupId);
  const heroes = eventState(play).heroes;
  return Boolean(group?.heroIds.some((id) => (heroes[id]?.hitPoints ?? 1) < 1));
};
