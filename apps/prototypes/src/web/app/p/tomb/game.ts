// Pure tomb rules (DEC-084 scene, DEC-039 costs, MEC-026 crawl). No React, no clock, no Math.random:
// the page and the simulation both play through these functions.
import { mean, runBatch, tally } from "../../../lib/batch.ts";
import type { Rng } from "../../../lib/rng.ts";
import { defaultValues, type TuningField, type TuningValues } from "../../../lib/tuning.ts";

export type Cost = { hp: number; money: number; corruption: number };
export type Room = { id: string; name: string; flavour: string; cost: Cost; final?: boolean };

// RtDT's 12 tomb rooms (ultimatedarktowerdata dungeons.js). The printed costs are warriors and spirit;
// these hit point / money / corruption costs are invented first guesses (DEC-039), tunable on the page.
export const ROOMS: readonly Room[] = [
  {
    id: "ossuary",
    name: "Ceremonial Ossuary",
    flavour: "Stacked bones shift and clatter underfoot.",
    cost: { hp: 8, money: 0, corruption: 0 },
  },
  {
    id: "shrine",
    name: "Corrupted Shrine",
    flavour: "A defiled altar hums, tempting the faithful.",
    cost: { hp: 2, money: 0, corruption: 1 },
  },
  {
    id: "embalming",
    name: "Embalming Chamber",
    flavour: "Jars of black resin and cold tables.",
    cost: { hp: 3, money: 2, corruption: 0 },
  },
  {
    id: "sigils",
    name: "Foreboding Sigils",
    flavour: "Glowing marks flare as you cross them.",
    cost: { hp: 3, money: 0, corruption: 2 },
  },
  {
    id: "offering",
    name: "Offering Table",
    flavour: "Tribute for the dead; the dead want more.",
    cost: { hp: 2, money: 4, corruption: 0 },
  },
  {
    id: "warning",
    name: "Ominous Warning",
    flavour: "A voice from nowhere tells you to turn back.",
    cost: { hp: 5, money: 0, corruption: 0 },
  },
  {
    id: "sepulchre",
    name: "Empty Sepulchre",
    flavour: "The lid is off. Whatever lay here is not.",
    cost: { hp: 6, money: 0, corruption: 0 },
  },
  {
    id: "ritual",
    name: "Ritual Circle",
    flavour: "Candles burn that no one lit.",
    cost: { hp: 3, money: 0, corruption: 2 },
  },
  {
    id: "sarcophagi",
    name: "Shattered Sarcophagi",
    flavour: "Splintered stone, and something looking for a way out.",
    cost: { hp: 4, money: 2, corruption: 1 },
  },
  {
    id: "shambling",
    name: "The Shambling Reborn",
    flavour: "The dead rise to meet you.",
    cost: { hp: 6, money: 0, corruption: 0 },
  },
  {
    id: "beetles",
    name: "Voracious Beetles",
    flavour: "A carpet of chitin pours from the walls.",
    cost: { hp: 4, money: 0, corruption: 0 },
  },
  {
    id: "guardian",
    name: "The Final Guardian",
    flavour: "The tomb's keeper bars the last door.",
    cost: { hp: 6, money: 0, corruption: 1 },
    final: true,
  },
];
export const FINAL_ROOM = ROOMS.find((r) => r.final) as Room;
const POOL = ROOMS.filter((r) => !r.final);

export const FIELDS: TuningField[] = [
  {
    key: "hp",
    label: "Party hit points",
    type: "number",
    default: 24,
    min: 1,
    step: 1,
    note: "Invented (DEC-039)",
  },
  {
    key: "money",
    label: "Party money",
    type: "number",
    default: 8,
    min: 0,
    step: 1,
    note: "Invented",
  },
  {
    key: "advantages",
    label: "Undead Advantages held",
    type: "number",
    default: 1,
    min: 0,
    step: 1,
    note: "MEC-026: a held one softens a room",
  },
  {
    key: "soften",
    label: "Softening (share of cost removed, 0 to 1)",
    type: "number",
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
    note: "Invented",
  },
  {
    key: "depth",
    label: "Target room depth (rooms to clear)",
    type: "number",
    default: 5,
    min: 1,
    max: 12,
    step: 1,
    note: "Invented; the target room is the last",
  },
  {
    key: "moneyScale",
    label: "Money cost scale",
    type: "number",
    default: 1,
    min: 0,
    step: 0.25,
    note: "Multiplies every room's money cost",
  },
  {
    key: "corruptionScale",
    label: "Corruption cost scale",
    type: "number",
    default: 1,
    min: 0,
    step: 0.25,
    note: "Multiplies every room's corruption cost",
  },
  ...ROOMS.map(
    (r): TuningField => ({
      key: `hp_${r.id}`,
      label: `Hit point cost: ${r.name}`,
      type: "number",
      default: r.cost.hp,
      min: 0,
      step: 1,
      note: "Invented; printed cost is in warriors and spirit",
    }),
  ),
  {
    key: "leaveBelow",
    label: "Simulation: leave when hit points are below",
    type: "number",
    default: 8,
    min: 0,
    step: 1,
    note: "Policy for the simulation only",
  },
  {
    key: "advantageMinHp",
    label: "Simulation: use Advantage on rooms costing at least",
    type: "number",
    default: 5,
    min: 0,
    step: 1,
    note: "Policy for the simulation only",
  },
  {
    key: "runs",
    label: "Simulation: runs",
    type: "number",
    default: 1000,
    min: 1,
    max: 100000,
    step: 100,
  },
];
export const DEFAULTS = defaultValues(FIELDS);

export type Config = {
  hp: number;
  money: number;
  advantages: number;
  soften: number;
  depth: number;
  moneyScale: number;
  corruptionScale: number;
  roomHp: Record<string, number>;
};

function num(values: TuningValues, key: string): number {
  const v = values[key];
  if (typeof v !== "number" || !Number.isFinite(v))
    throw new Error(`Tuning value ${key} must be a number.`);
  return v;
}

export function toConfig(values: TuningValues): Config {
  const depth = Math.round(num(values, "depth"));
  if (depth < 1 || depth > ROOMS.length)
    throw new Error(`Depth must be 1 to ${ROOMS.length}, got ${depth}.`);
  const roomHp: Record<string, number> = {};
  for (const r of ROOMS) roomHp[r.id] = num(values, `hp_${r.id}`);
  return {
    hp: num(values, "hp"),
    money: num(values, "money"),
    advantages: Math.round(num(values, "advantages")),
    soften: Math.min(1, Math.max(0, num(values, "soften"))),
    depth,
    moneyScale: num(values, "moneyScale"),
    corruptionScale: num(values, "corruptionScale"),
    roomHp,
  };
}

export type Outcome = "finished" | "left" | "dead";
export type Entered = { room: Room; cost: Cost; softened: boolean };
export type TombState = {
  config: Config;
  route: Room[]; // the rooms in order; the last is the target room
  entered: Entered[]; // cleared rooms, in order
  pending: { room: Room; cost: Cost } | null; // revealed, not yet paid
  hp: number;
  money: number;
  corruption: number;
  advantages: number;
  outcome: Outcome | null;
};

/** Cost of a room under the config, before any softening. */
export function roomCost(config: Config, room: Room): Cost {
  return {
    hp: Math.max(0, Math.round(config.roomHp[room.id] ?? room.cost.hp)),
    money: Math.max(0, Math.round(room.cost.money * config.moneyScale)),
    corruption: Math.max(0, Math.round(room.cost.corruption * config.corruptionScale)),
  };
}

export function softenedCost(config: Config, cost: Cost): Cost {
  const k = 1 - config.soften;
  return {
    hp: Math.round(cost.hp * k),
    money: Math.round(cost.money * k),
    corruption: Math.round(cost.corruption * k),
  };
}

export function newTomb(rng: Rng, config: Config): TombState {
  const route = [...rng.shuffle(POOL).slice(0, config.depth - 1), FINAL_ROOM];
  return {
    config,
    route,
    entered: [],
    pending: null,
    hp: config.hp,
    money: config.money,
    corruption: 0,
    advantages: config.advantages,
    outcome: null,
  };
}

function live(s: TombState): void {
  if (s.outcome) throw new Error(`The run is over (${s.outcome}).`);
}

/** Reveal the next room. Nothing is paid yet. */
export function enter(s: TombState): TombState {
  live(s);
  if (s.pending) throw new Error("A room is already open; resolve it first.");
  const room = s.route[s.entered.length];
  if (!room) throw new Error("There is no next room.");
  return { ...s, pending: { room, cost: roomCost(s.config, room) } };
}

/** Pay the open room's cost (or soften it with an Advantage), and clear it. A money shortfall is paid in hit points. */
export function resolve(s: TombState, useAdvantage: boolean): TombState {
  live(s);
  if (!s.pending) throw new Error("No room is open.");
  if (useAdvantage && s.advantages < 1) throw new Error("No Undead Advantage is held.");
  const cost = useAdvantage ? softenedCost(s.config, s.pending.cost) : s.pending.cost;
  const shortfall = Math.max(0, cost.money - s.money);
  const hp = Math.max(0, s.hp - cost.hp - shortfall);
  const entered = [...s.entered, { room: s.pending.room, cost, softened: useAdvantage }];
  const outcome: Outcome | null =
    hp === 0 ? "dead" : entered.length === s.route.length ? "finished" : null;
  return {
    ...s,
    entered,
    pending: null,
    hp,
    money: Math.max(0, s.money - cost.money),
    corruption: s.corruption + cost.corruption,
    advantages: s.advantages - (useAdvantage ? 1 : 0),
    outcome,
  };
}

/** The party walks out. Allowed at any doorway, not while a room is open. */
export function leave(s: TombState): TombState {
  live(s);
  if (s.pending) throw new Error("Resolve the open room before leaving.");
  return { ...s, outcome: "left" };
}

export function totals(s: TombState): Cost & { rooms: number } {
  return {
    rooms: s.entered.length,
    hp: s.config.hp - s.hp,
    money: s.config.money - s.money,
    corruption: s.corruption,
  };
}

/** One whole run under "leave when hit points are below X". */
export function playPolicy(
  rng: Rng,
  config: Config,
  leaveBelow: number,
  advantageMinHp: number,
): TombState {
  let s = newTomb(rng, config);
  while (!s.outcome) {
    if (s.hp < leaveBelow) {
      s = leave(s);
      break;
    }
    s = enter(s);
    const p = s.pending as NonNullable<TombState["pending"]>;
    s = resolve(s, s.advantages > 0 && p.cost.hp >= advantageMinHp);
  }
  return s;
}

export type SimSummary = {
  runs: number;
  finished: number;
  left: number;
  dead: number;
  meanRooms: number;
  meanHp: number;
} | null;

export function simulate(seed: string | number, values: TuningValues): SimSummary {
  const config = toConfig(values);
  const runs = Math.round(num(values, "runs"));
  const leaveBelow = num(values, "leaveBelow");
  const advMin = num(values, "advantageMinHp");
  const batch = runBatch(runs, seed, (rng) => playPolicy(rng, config, leaveBelow, advMin));
  if (batch.length === 0) return null;
  const t = tally(batch, (r) => r.outcome ?? "none");
  return {
    runs: batch.length,
    finished: (t.finished ?? 0) / batch.length,
    left: (t.left ?? 0) / batch.length,
    dead: (t.dead ?? 0) / batch.length,
    meanRooms: mean(batch, (r) => r.entered.length) as number,
    meanHp: mean(batch, (r) => r.hp) as number,
  };
}
