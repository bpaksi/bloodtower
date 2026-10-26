// Pure turn-loop rules for P-08 (DEC-077, DEC-078, DEC-102). No React and no clock: the page and
// the 1,000-turn simulation both call these, so they cannot drift apart.
import type { Rng } from "@dark-tower/rng";
import { mean, runBatch, share } from "../../../lib/batch.ts";
import { defaultValues, type TuningField, type TuningValues } from "../../../lib/tuning.ts";

export type SpaceKind = "wild" | "village" | "sanctuary";

/** A made-up straight road: 12 spaces, a village at 4, a sanctuary at 8, wild between. */
export const BOARD: readonly SpaceKind[] = [
  "wild",
  "wild",
  "wild",
  "wild",
  "village",
  "wild",
  "wild",
  "wild",
  "sanctuary",
  "wild",
  "wild",
  "wild",
];
export const SPACES = BOARD.map((kind, index) => ({ kind, index }));
export const VILLAGE = BOARD.indexOf("village");
export const START: readonly number[] = [0, 11];
export const GROUP_NAMES = ["Group A", "Group B"] as const;

export const FIELDS: readonly TuningField[] = [
  {
    key: "dice",
    label: "Move dice",
    type: "text",
    default: "1d6",
    note: "DEC-102: the dice are open (Q-043)",
  },
  {
    key: "floor",
    label: "Move floor",
    type: "number",
    default: 1,
    min: 0,
    note: "DEC-102: never below a floor",
  },
  {
    key: "virtuesA",
    label: "Group A helping virtues",
    type: "number",
    default: 0,
    min: 0,
    note: "DEC-102: +1 each",
  },
  {
    key: "corruptionA",
    label: "Group A corruption",
    type: "number",
    default: 0,
    min: 0,
    note: "DEC-102: -1 each",
  },
  {
    key: "virtuesB",
    label: "Group B helping virtues",
    type: "number",
    default: 0,
    min: 0,
    note: "DEC-102: +1 each",
  },
  {
    key: "corruptionB",
    label: "Group B corruption",
    type: "number",
    default: 0,
    min: 0,
    note: "DEC-102: -1 each",
  },
  {
    key: "groups",
    label: "Groups (1 or 2)",
    type: "number",
    default: 2,
    min: 1,
    max: 2,
    note: "DEC-077",
  },
  {
    key: "menu",
    label: "Village building menu",
    type: "text",
    default: "Tavern, Smithy, Market",
    note: "DEC-078: each pick costs 1 move; comma separated",
  },
  { key: "sanctuaryMenu", label: "Sanctuary menu", type: "text", default: "Pray", note: "DEC-078" },
  {
    key: "wildEvent",
    label: "Wild event chance (0-1)",
    type: "number",
    default: 0.4,
    min: 0,
    max: 1,
    step: 0.05,
    note: "invented",
  },
];
export const DEFAULTS: TuningValues = defaultValues(FIELDS);

export type Tuning = {
  dice: string;
  floor: number;
  virtues: number[];
  corruption: number[];
  groups: number;
  menu: string[];
  sanctuaryMenu: string[];
  wildEvent: number;
};

function list(text: unknown): string[] {
  return String(text)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function readTuning(v: TuningValues): Tuning {
  return {
    dice: String(v.dice),
    floor: Number(v.floor),
    virtues: [Number(v.virtuesA), Number(v.virtuesB)],
    corruption: [Number(v.corruptionA), Number(v.corruptionB)],
    groups: Number(v.groups),
    menu: list(v.menu),
    sanctuaryMenu: list(v.sanctuaryMenu),
    wildEvent: Number(v.wildEvent),
  };
}

export type MoveRoll = {
  dice: number[];
  diceTotal: number;
  virtues: number;
  corruption: number;
  raw: number;
  floor: number;
  total: number;
  floored: boolean;
};

/** DEC-102: roll, +1 per helping virtue, -1 per corruption, never below the floor. */
export function rollMoves(rng: Rng, t: Tuning, group: number): MoveRoll {
  const r = rng.roll(t.dice);
  const virtues = t.virtues[group] ?? 0;
  const corruption = t.corruption[group] ?? 0;
  const raw = r.total + virtues - corruption;
  const total = Math.max(t.floor, raw);
  return {
    dice: r.dice,
    diceTotal: r.total,
    virtues,
    corruption,
    raw,
    floor: t.floor,
    total,
    floored: total !== raw,
  };
}

export type Group = {
  name: string;
  at: number;
  roll: MoveRoll;
  movesLeft: number;
  spent: number;
  done: boolean;
  taken: string[]; // building actions already taken this turn
  steps: number;
};

export function newGroups(rng: Rng, t: Tuning, positions: readonly number[]): Group[] {
  const out: Group[] = [];
  for (let i = 0; i < t.groups; i++) {
    const roll = rollMoves(rng, t, i);
    out.push({
      name: GROUP_NAMES[i] ?? `Group ${i + 1}`,
      // Missing slot (e.g. Groups 1→2 mid-game) uses the board start, not space 0 on top of A.
      at: positions[i] ?? START[i] ?? 0,
      roll,
      movesLeft: roll.total,
      spent: 0,
      done: false,
      taken: [],
      steps: 0,
    });
  }
  return out;
}

export function menuAt(kind: SpaceKind, t: Tuning): string[] {
  return kind === "village" ? t.menu : kind === "sanctuary" ? t.sanctuaryMenu : [];
}

/** Walk one space (DEC-078: 1 move). Returns the group unchanged with a reason if it cannot. */
export function walk(g: Group, dir: -1 | 1): { group: Group; error?: string } {
  if (g.done) return { group: g, error: "Turn already ended." };
  if (g.movesLeft < 1) return { group: g, error: "No moves left." };
  const to = g.at + dir;
  if (to < 0 || to >= BOARD.length) return { group: g, error: "End of the road." };
  return {
    group: { ...g, at: to, movesLeft: g.movesLeft - 1, spent: g.spent + 1, steps: g.steps + 1 },
  };
}

/** Take one building action (DEC-078: 1 move each, each once a turn). */
export function act(g: Group, action: string, t: Tuning): { group: Group; error?: string } {
  if (g.done) return { group: g, error: "Turn already ended." };
  if (g.movesLeft < 1) return { group: g, error: "No moves left." };
  const menu = menuAt(BOARD[g.at] as SpaceKind, t);
  if (!menu.includes(action)) return { group: g, error: `"${action}" is not on the menu here.` };
  if (g.taken.includes(`${g.at}:${action}`))
    return { group: g, error: `"${action}" already taken this turn.` };
  return {
    group: {
      ...g,
      movesLeft: g.movesLeft - 1,
      spent: g.spent + 1,
      taken: [...g.taken, `${g.at}:${action}`],
    },
  };
}

export function endTurn(g: Group): Group {
  return { ...g, done: true };
}

const WILD_EVENTS = ["Wolves", "Lost trail", "Abandoned camp", "Storm"];
const VILLAGE_EVENTS = ["Rumour", "Brawl", "Traveller", "Market day"];
const SANCTUARY_EVENTS = ["Quiet blessing", "Pilgrims"];

/** Beat 4: an event where the group stopped. Villages and sanctuaries always have one; wild by chance. */
export function eventFor(rng: Rng, g: Group, t: Tuning): string {
  const kind = BOARD[g.at] as SpaceKind;
  if (kind === "village") return rng.pick(VILLAGE_EVENTS);
  if (kind === "sanctuary") return rng.pick(SANCTUARY_EVENTS);
  return rng.chance(t.wildEvent) ? rng.pick(WILD_EVENTS) : "Nothing happens";
}

export type SimResult = {
  moves: number;
  reachedVillage: boolean; // can reach the village AND take at least one action
  movesLeft: number; // unused after a sensible plan
};

/**
 * One group's turn from a random start, played by a simple policy: head for the village; if it
 * can get there with a move to spare, take each menu action it can afford; otherwise walk toward
 * it as far as it can. Moves left are those it could not use.
 */
export function simulateTurn(rng: Rng, t: Tuning): SimResult {
  const candidates = BOARD.map((_, i) => i).filter((i) => i !== VILLAGE);
  const start = rng.pick(candidates);
  const { total } = rollMoves(rng, t, 0);
  const dist = Math.abs(start - VILLAGE);
  if (total > dist && t.menu.length > 0) {
    const actions = Math.min(total - dist, t.menu.length);
    return { moves: total, reachedVillage: true, movesLeft: total - dist - actions };
  }
  if (total >= dist) return { moves: total, reachedVillage: false, movesLeft: total - dist };
  return { moves: total, reachedVillage: false, movesLeft: 0 };
}

export function simulate(count: number, seed: string, t: Tuning) {
  const runs = runBatch(count, seed, (rng) => simulateTurn(rng, t));
  return {
    turns: count,
    reachShare: share(runs, (r) => r.reachedVillage),
    unusedMean: mean(runs, (r) => r.movesLeft),
    movesMean: mean(runs, (r) => r.moves),
  };
}
