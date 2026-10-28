// Pure rules for the encampment (MEC-028, DEC-091). No React: the page and the simulation share it.
import type { Rng } from "@dark-tower/rng";
import { runBatch } from "../../../lib/batch.ts";
import { defaultValues, type TuningField, type TuningValues } from "../../../lib/tuning.ts";

export const FIELDS: TuningField[] = [
  {
    key: "purse",
    label: "Starting purse",
    type: "number",
    default: 40,
    min: 0,
    note: "invented (DEC-007 purse)",
  },
  {
    key: "wares",
    label: "Wares (name:price, comma separated)",
    type: "text",
    default: "Healing draught:10,Rope:6,Lantern oil:8,Antidote:12",
    note: "invented",
  },
  {
    key: "discounts",
    label: "Money off per die face 1..6 (comma separated)",
    type: "text",
    default: "0,1,1,2,2,3",
    note: "DEC-091: how much each face takes off is for later",
  },
  {
    key: "maxTemper",
    label: "Temper at which the camp attacks",
    type: "number",
    default: 6,
    min: 1,
    note: "MEC-028 full temper; invented",
  },
  {
    key: "haggleTemper",
    label: "Temper a haggle adds",
    type: "number",
    default: 1,
    min: 0,
    note: "MEC-028 haggling hard",
  },
  {
    key: "insultFace",
    label: "Die faces at or below this add 1 more temper",
    type: "number",
    default: 1,
    min: 0,
    max: 6,
    note: "invented",
  },
  {
    key: "refuseTemper",
    label: "Temper refusing an offer adds",
    type: "number",
    default: 1,
    min: 0,
    note: "MEC-028",
  },
  {
    key: "stealTemper",
    label: "Temper a clean theft adds",
    type: "number",
    default: 2,
    min: 0,
    note: "MEC-028",
  },
  {
    key: "catchChance",
    label: "Chance a theft is caught (0 to 1)",
    type: "number",
    default: 0.4,
    min: 0,
    max: 1,
    step: 0.05,
    note: "caught = full temper; invented",
  },
  {
    key: "calmAmount",
    label: "Temper a Humanoid Advantage removes",
    type: "number",
    default: 2,
    min: 0,
    note: "MEC-028 calms once; invented size",
  },
  {
    key: "partyMight",
    label: "Party Might (placeholder fight)",
    type: "number",
    default: 3,
    min: 0,
    note: "DEC-101",
  },
  {
    key: "campStrength",
    label: "Camp strength (fight: Might + 1d6 must reach it)",
    type: "number",
    default: 6,
    min: 0,
    note: "invented",
  },
  {
    key: "fightLoss",
    label: "Purse lost when the fight is lost",
    type: "number",
    default: 15,
    min: 0,
    note: "invented",
  },
];

export type Ware = { name: string; price: number };
export type Config = {
  purse: number;
  wares: Ware[];
  discounts: number[];
  maxTemper: number;
  haggleTemper: number;
  insultFace: number;
  refuseTemper: number;
  stealTemper: number;
  catchChance: number;
  calmAmount: number;
  partyMight: number;
  campStrength: number;
  fightLoss: number;
};

const num = (v: TuningValues, k: string): number => {
  const x = v[k];
  if (typeof x !== "number" || Number.isNaN(x)) throw new Error(`Tuning "${k}" must be a number.`);
  return x;
};

/** Reads tuning values into a config. Throws on bad text, never guesses. */
export function configFrom(v: TuningValues = defaultValues(FIELDS)): Config {
  const wares = String(v.wares)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [name, price] = s.split(":");
      const p = Number(price);
      if (!name || price === undefined || Number.isNaN(p) || p < 0) {
        throw new Error(`Ware "${s}" must look like name:price.`);
      }
      return { name: name.trim(), price: p };
    });
  if (wares.length === 0) throw new Error("The camp needs at least one ware.");
  const discounts = String(v.discounts)
    .split(",")
    .map((s) => Number(s.trim()));
  if (discounts.length !== 6 || discounts.some((d) => Number.isNaN(d) || d < 0)) {
    throw new Error("Discounts must be six numbers, one per die face.");
  }
  return {
    purse: num(v, "purse"),
    wares,
    discounts,
    maxTemper: num(v, "maxTemper"),
    haggleTemper: num(v, "haggleTemper"),
    insultFace: num(v, "insultFace"),
    refuseTemper: num(v, "refuseTemper"),
    stealTemper: num(v, "stealTemper"),
    catchChance: num(v, "catchChance"),
    calmAmount: num(v, "calmAmount"),
    partyMight: num(v, "partyMight"),
    campStrength: num(v, "campStrength"),
    fightLoss: num(v, "fightLoss"),
  };
}

export type WareState = {
  name: string;
  list: number;
  price: number;
  haggled: boolean;
  status: "open" | "bought" | "refused" | "stolen" | "lost";
};
export type Fight = { roll: number; total: number; won: boolean };
export type CampState = {
  purse: number;
  temper: number;
  wares: WareState[];
  advantage: boolean; // a Humanoid Advantage is held and not yet used
  attacked: boolean;
  left: boolean;
  fight: Fight | null;
  saved: number; // list price minus paid, for bought and stolen wares
  haggles: number;
  log: string[];
};

export type Action =
  | { type: "buy"; ware: number }
  | { type: "haggle"; ware: number; face: number }
  | { type: "refuse"; ware: number }
  | { type: "steal"; ware: number }
  | { type: "calm" }
  | { type: "leave" };

export function startVisit(cfg: Config, advantage: boolean): CampState {
  return {
    purse: cfg.purse,
    temper: 0,
    wares: cfg.wares.map((w) => ({
      name: w.name,
      list: w.price,
      price: w.price,
      haggled: false,
      status: "open",
    })),
    advantage,
    attacked: false,
    left: false,
    fight: null,
    saved: 0,
    haggles: 0,
    log: ["The merchant spreads out the wares."],
  };
}

export const isOver = (s: CampState) =>
  s.attacked || s.left || s.wares.every((w) => w.status !== "open");

function raise(s: CampState, cfg: Config, rng: Rng, by: number, why: string) {
  s.temper = Math.min(cfg.maxTemper, s.temper + by);
  if (by > 0) s.log.push(`Temper +${by} (${why}) -> ${s.temper}/${cfg.maxTemper}.`);
  if (s.temper >= cfg.maxTemper) attack(s, cfg, rng);
}

function attack(s: CampState, cfg: Config, rng: Rng) {
  s.attacked = true;
  for (const w of s.wares) if (w.status === "open") w.status = "lost";
  s.log.push("The camp attacks! (placeholder fight)");
  {
    const roll = rng.int(1, 6);
    const total = cfg.partyMight + roll;
    const won = total >= cfg.campStrength;
    s.fight = { roll, total, won };
    if (!won) s.purse = Math.max(0, s.purse - cfg.fightLoss);
    s.log.push(
      `Fight: Might ${cfg.partyMight} + ${roll} = ${total} vs ${cfg.campStrength}: ${won ? "won" : `lost, purse -${cfg.fightLoss}`}.`,
    );
  }
}

/** Applies one action. Returns a new state. Throws on an action the rules do not allow. */
export function step(prev: CampState, action: Action, cfg: Config, rng: Rng): CampState {
  if (isOver(prev)) throw new Error("The visit is over.");
  const s: CampState = structuredClone(prev);
  const ware = "ware" in action ? s.wares[action.ware] : undefined;
  if ("ware" in action && ware?.status !== "open") throw new Error("That ware is not on offer.");

  switch (action.type) {
    case "buy": {
      if (!ware) throw new Error("No ware.");
      if (s.purse < ware.price)
        throw new Error(`Cannot afford ${ware.name} (${ware.price}, purse ${s.purse}).`);
      s.purse -= ware.price;
      s.saved += ware.list - ware.price;
      ware.status = "bought";
      s.log.push(`Bought ${ware.name} for ${ware.price}.`);
      break;
    }
    case "haggle": {
      if (!ware) throw new Error("No ware.");
      if (ware.haggled) throw new Error(`${ware.name} was already haggled.`);
      if (!Number.isInteger(action.face) || action.face < 1 || action.face > 6) {
        throw new Error("The haggle die shows 1 to 6.");
      }
      const off = Math.min(ware.price, cfg.discounts[action.face - 1] ?? 0);
      ware.haggled = true;
      ware.price -= off;
      s.haggles++;
      s.log.push(`Haggled ${ware.name}: die ${action.face}, ${off} off, now ${ware.price}.`);
      raise(
        s,
        cfg,
        rng,
        cfg.haggleTemper + (action.face <= cfg.insultFace ? 1 : 0),
        "haggling hard",
      );
      break;
    }
    case "refuse": {
      if (!ware) throw new Error("No ware.");
      ware.status = "refused";
      s.log.push(`Refused ${ware.name}.`);
      raise(s, cfg, rng, cfg.refuseTemper, "refusing an offer");
      break;
    }
    case "steal": {
      if (!ware) throw new Error("No ware.");
      if (rng.chance(cfg.catchChance)) {
        ware.status = "lost";
        s.log.push(`Caught stealing ${ware.name}!`);
        raise(s, cfg, rng, cfg.maxTemper, "caught stealing");
      } else {
        ware.status = "stolen";
        s.saved += ware.list;
        s.log.push(`Stole ${ware.name} unseen.`);
        raise(s, cfg, rng, cfg.stealTemper, "stealing");
      }
      break;
    }
    case "calm": {
      if (!s.advantage) throw new Error("No Humanoid Advantage to spend.");
      s.advantage = false;
      s.temper = Math.max(0, s.temper - cfg.calmAmount);
      s.log.push(`Humanoid Advantage calms the camp: temper ${s.temper}/${cfg.maxTemper}.`);
      break;
    }
    case "leave": {
      s.left = true;
      s.log.push("The party leaves.");
      break;
    }
  }
  return s;
}

export type Policy = "haggle-always" | "haggle-never" | "haggle-once";
export const POLICIES: Policy[] = ["haggle-always", "haggle-never", "haggle-once"];

/** One whole visit under a policy; the die is rolled from the rng. Spends an Advantage when one more haggle would anger the camp. */
export function playVisit(rng: Rng, cfg: Config, policy: Policy, advantage = false): CampState {
  let s = startVisit(cfg, advantage);
  let haggled = 0;
  for (let i = 0; i < cfg.wares.length && !isOver(s); i++) {
    const wantsHaggle = policy === "haggle-always" || (policy === "haggle-once" && haggled === 0);
    if (wantsHaggle) {
      if (s.advantage && s.temper + cfg.haggleTemper + 1 >= cfg.maxTemper)
        s = step(s, { type: "calm" }, cfg, rng);
      s = step(s, { type: "haggle", ware: i, face: rng.int(1, 6) }, cfg, rng);
      haggled++;
    }
    if (isOver(s)) break;
    const w = s.wares[i];
    if (w && w.status === "open" && s.purse >= w.price)
      s = step(s, { type: "buy", ware: i }, cfg, rng);
    else if (w && w.status === "open") s = step(s, { type: "leave" }, cfg, rng);
  }
  return s;
}

export type PolicyResult = {
  policy: Policy;
  visits: number;
  moneySaved: number;
  attackShare: number;
};

/** Hard upper bound on simulated visits (main-thread batch; matches fortress visitCap max). */
export const MAX_SIM_VISITS = 2000;

export function simulate(
  cfg: Config,
  seed: string,
  visits: number,
  advantage = false,
): PolicyResult[] {
  const nVisits = Math.min(MAX_SIM_VISITS, Math.max(0, Math.floor(visits)));
  return POLICIES.map((policy) => {
    const runs = runBatch(nVisits, `${seed}:${policy}`, (rng) =>
      playVisit(rng, cfg, policy, advantage),
    );
    const n = runs.length;
    return {
      policy,
      visits: n,
      moneySaved: runs.reduce((a, r) => a + r.result.saved, 0) / n,
      attackShare: runs.filter((r) => r.result.attacked).length / n,
    };
  });
}
